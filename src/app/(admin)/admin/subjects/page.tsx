"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Tables } from "@/types/database";
import toast from "react-hot-toast";

type Subject = Tables<"subjects">;

interface CurriculumEntry {
  periodId: string;
  periodName: string;
  content: string;
  entryId?: string;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [temarioOpen, setTemarioOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabaseRef = useRef(createClient());

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    code: "",
    credits: "1",
  });

  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [periods, setPeriods] = useState<{ id: string; name: string; order: number }[]>([]);
  const [temarioClassroom, setTemarioClassroom] = useState("");
  const [temarioSubject, setTemarioSubject] = useState("");
  const [curriculumEntries, setCurriculumEntries] = useState<CurriculumEntry[]>([]);
  const [loadingTemario, setLoadingTemario] = useState(false);
  const [savingTemario, setSavingTemario] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabaseRef.current
        .from("subjects")
        .select("*")
        .order("name");
      if (data) setSubjects(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMeta = useCallback(async () => {
    const [{ data: cls }, { data: per }] = await Promise.all([
      supabaseRef.current.from("classrooms").select("id, name").eq("status", "active").order("name"),
      supabaseRef.current.from("school_periods").select("id, name, order").eq("status", "active").order("order"),
    ]);
    if (cls) setClassrooms(cls);
    if (per) setPeriods(per);
  }, []);

  useEffect(() => {
    fetchData();
    fetchMeta();
  }, [fetchData, fetchMeta]);

  const loadTemario = useCallback(
    async (subjectId: string, classroomId: string) => {
      if (!classroomId || !subjectId) return;
      setLoadingTemario(true);
      try {
        const entries: CurriculumEntry[] = periods.map((p) => ({
          periodId: p.id,
          periodName: p.name,
          content: "",
        }));

        const { data: csData } = await supabaseRef.current
          .from("classroom_subjects")
          .select("id")
          .eq("classroom_id", classroomId)
          .eq("subject_id", subjectId)
          .single();

        if (csData) {
          const { data: curData } = await supabaseRef.current
            .from("curriculum_entries")
            .select("*")
            .eq("classroom_subject_id", csData.id);

          if (curData) {
            curData.forEach((c) => {
              const idx = entries.findIndex((e) => e.periodId === c.school_period_id);
              if (idx >= 0) {
                entries[idx].content = c.content || "";
                entries[idx].entryId = c.id;
              }
            });
          }
        }
        setCurriculumEntries(entries);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoadingTemario(false);
      }
    },
    [periods]
  );

  const openTemario = (subject: Subject) => {
    setSelectedSubject(subject);
    setTemarioSubject(subject.id);
    setTemarioClassroom("");
    setCurriculumEntries([]);
    setTemarioOpen(true);
  };

  const handleSaveTemario = async () => {
    if (!temarioClassroom || !temarioSubject) {
      toast.error("Seleccione un salón");
      return;
    }
    setSavingTemario(true);
    try {
      let csId: string | null = null;
      const { data: csData } = await supabaseRef.current
        .from("classroom_subjects")
        .select("id")
        .eq("classroom_id", temarioClassroom)
        .eq("subject_id", temarioSubject)
        .single();

      if (!csData) {
        const { data: newCs } = await supabaseRef.current
          .from("classroom_subjects")
          .insert({ classroom_id: temarioClassroom, subject_id: temarioSubject })
          .select("id")
          .single();
        if (newCs) csId = newCs.id;
      } else {
        csId = csData.id;
      }

      if (!csId) {
        toast.error("Error al crear la asignación");
        return;
      }

      for (const entry of curriculumEntries) {
        if (!entry.content.trim()) continue;
        const payload = {
          classroom_subject_id: csId,
          school_period_id: entry.periodId,
          content: entry.content.trim(),
        };
        if (entry.entryId) {
          await supabaseRef.current
            .from("curriculum_entries")
            .update({ content: entry.content.trim() })
            .eq("id", entry.entryId);
        } else {
          await supabaseRef.current.from("curriculum_entries").insert(payload);
        }
      }

      toast.success("Temario guardado correctamente");
      setTemarioOpen(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar el temario");
    } finally {
      setSavingTemario(false);
    }
  };

  const handleOpenModal = (subject?: Subject) => {
    if (subject) {
      setSelectedSubject(subject);
      setFormData({
        name: subject.name,
        description: subject.description || "",
        code: subject.code,
        credits: String(subject.credits),
      });
    } else {
      setSelectedSubject(null);
      setFormData({ name: "", description: "", code: "", credits: "1" });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = { ...formData, credits: parseInt(formData.credits) };
      if (selectedSubject) {
        await supabaseRef.current
          .from("subjects")
          .update(data)
          .eq("id", selectedSubject.id);
      } else {
        await supabaseRef.current.from("subjects").insert([data]);
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSubject) return;
    setIsSubmitting(true);
    try {
      await supabaseRef.current
        .from("subjects")
        .delete()
        .eq("id", selectedSubject.id);
      setDeleteDialogOpen(false);
      setSelectedSubject(null);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "code", header: "Código" },
    { key: "name", header: "Nombre" },
    { key: "description", header: "Descripción" },
    { key: "credits", header: "Créditos" },
  ];

  return (
    <div>
      <PageHeader
        title="Materias"
        description="Gestionar materias y su temario"
        actionLabel="Nueva Materia"
        onAction={() => handleOpenModal()}
      />
      {loading ? null : subjects.length === 0 ? (
        <EmptyState
          title="No hay materias"
          description="Comienza creando la primera materia"
          actionLabel="Nueva Materia"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <DataTable
          data={subjects}
          columns={columns}
          extraActions={(subject) => (
            <button
              onClick={() => openTemario(subject)}
              className="text-xs text-primary-600 hover:text-primary-800 ml-2"
            >
              Temario
            </button>
          )}
          onEdit={handleOpenModal}
          onDelete={(item) => {
            setSelectedSubject(item);
            setDeleteDialogOpen(true);
          }}
        />
      )}

      <Modal
        isOpen={temarioOpen}
        onClose={() => setTemarioOpen(false)}
        title={`Temario: ${selectedSubject?.name || ""}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setTemarioOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTemario} isLoading={savingTemario}>
              Guardar Temario
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Salón"
            value={temarioClassroom}
            onChange={(e) => {
              setTemarioClassroom(e.target.value);
              if (e.target.value) loadTemario(temarioSubject, e.target.value);
            }}
            options={[
              { value: "", label: "Seleccionar salón..." },
              ...classrooms.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          {temarioClassroom && loadingTemario && (
            <p className="text-sm text-slate-500 text-center py-4">
              Cargando temario...
            </p>
          )}

          {temarioClassroom && !loadingTemario && (
            <div className="space-y-3">
              {curriculumEntries.map((entry, idx) => (
                <div
                  key={entry.periodId}
                  className="border border-slate-200 rounded-xl p-4"
                >
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">
                    {idx + 1}. {entry.periodName}
                  </h4>
                  <textarea
                    value={entry.content}
                    onChange={(e) => {
                      const updated = [...curriculumEntries];
                      updated[idx].content = e.target.value;
                      setCurriculumEntries(updated);
                    }}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder={`Contenido temático para ${entry.periodName.toLowerCase()}...`}
                  />
                </div>
              ))}
            </div>
          )}

          {!temarioClassroom && (
            <p className="text-sm text-slate-400 text-center py-4">
              Seleccione un salón para editar el temario de esta materia
            </p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedSubject ? "Editar Materia" : "Nueva Materia"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              {selectedSubject ? "Guardar" : "Crear"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Código"
            value={formData.code}
            onChange={(e) =>
              setFormData({ ...formData, code: e.target.value })
            }
            placeholder="MAT-5"
            required
          />
          <Input
            label="Nombre"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            required
          />
          <Input
            label="Descripción"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
          <Input
            label="Créditos"
            type="number"
            value={formData.credits}
            onChange={(e) =>
              setFormData({ ...formData, credits: e.target.value })
            }
            required
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Materia"
        message={`¿Está seguro de eliminar ${selectedSubject?.name}?`}
        isLoading={isSubmitting}
      />
    </div>
  );
}
