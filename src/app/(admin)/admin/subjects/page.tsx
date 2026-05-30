"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { ShimmerGrid } from "@/components/common/SkeletonLoader";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { RichTextEditor } from "@/components/common/RichTextEditor";
import type { Tables } from "@/types/database";
import toast from "react-hot-toast";

type Subject = Tables<"subjects">;

interface CurriculumFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
}

interface CurriculumEntry {
  periodId: string;
  periodName: string;
  content: string;
  entryId?: string;
  files: CurriculumFile[];
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
  const [temarioDirtyConfirm, setTemarioDirtyConfirm] = useState(false);
  const initialEntriesRef = useRef<CurriculumEntry[]>([]);

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
          files: [],
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
            const entryIds = curData.map((c) => c.id);
            const { data: filesData } = await supabaseRef.current
              .from("curriculum_files")
              .select("*")
              .in("curriculum_entry_id", entryIds);

            curData.forEach((c) => {
              const idx = entries.findIndex((e) => e.periodId === c.school_period_id);
              if (idx >= 0) {
                entries[idx].content = c.content || "";
                entries[idx].entryId = c.id;
                if (filesData) {
                  entries[idx].files = filesData
                    .filter((f) => f.curriculum_entry_id === c.id)
                    .map((f) => ({
                      id: f.id,
                      file_name: f.file_name,
                      file_path: f.file_path,
                      file_size: f.file_size,
                      content_type: f.content_type,
                    }));
                }
              }
            });
          }
        }
        setCurriculumEntries(entries);
        initialEntriesRef.current = JSON.parse(JSON.stringify(entries));
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoadingTemario(false);
      }
    },
    [periods]
  );

  const handleFileUpload = useCallback(
    async (entryIdx: number) => {
      const entry = curriculumEntries[entryIdx];
      if (!entry.entryId) {
        // Create entry first
        const { data: csData } = await supabaseRef.current
          .from("classroom_subjects")
          .select("id")
          .eq("classroom_id", temarioClassroom)
          .eq("subject_id", temarioSubject)
          .single();

        let csId = csData?.id;
        if (!csId) {
          const { data: newCs } = await supabaseRef.current
            .from("classroom_subjects")
            .insert({ classroom_id: temarioClassroom, subject_id: temarioSubject })
            .select("id")
            .single();
          if (newCs) csId = newCs.id;
        }

        if (!csId) {
          toast.error("Error al crear la entrada");
          return null;
        }

        const { data: newEntry } = await supabaseRef.current
          .from("curriculum_entries")
          .insert({
            classroom_subject_id: csId,
            school_period_id: entry.periodId,
            content: entry.content.trim() || " ",
          })
          .select("id")
          .single();

        if (newEntry) {
          const updated = [...curriculumEntries];
          updated[entryIdx].entryId = newEntry.id;
          setCurriculumEntries(updated);
          return newEntry.id;
        }
        return null;
      }
      return entry.entryId;
    },
    [curriculumEntries, temarioClassroom, temarioSubject]
  );

  const handleUploadFile = useCallback(
    (entryIdx: number) => async (file: File) => {
      const entryId = await handleFileUpload(entryIdx);
      if (!entryId) {
        toast.error("Error al preparar la carga");
        return;
      }

      const path = `curriculum/${entryId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabaseRef.current.storage
        .from("curriculum-files")
        .upload(path, file);

      if (uploadError) {
        toast.error("Error al subir archivo");
        return;
      }

      const { data: urlData } = supabaseRef.current.storage
        .from("curriculum-files")
        .getPublicUrl(path);

      const { data: fileRecord } = await supabaseRef.current
        .from("curriculum_files")
        .insert({
          curriculum_entry_id: entryId,
          file_name: file.name,
          file_path: urlData.publicUrl,
          file_size: file.size,
          content_type: file.type,
        })
        .select("*")
        .single();

      if (fileRecord) {
        const updated = [...curriculumEntries];
        updated[entryIdx].files = [
          ...updated[entryIdx].files,
          {
            id: fileRecord.id,
            file_name: fileRecord.file_name,
            file_path: fileRecord.file_path,
            file_size: fileRecord.file_size,
            content_type: fileRecord.content_type,
          },
        ];
        setCurriculumEntries(updated);
        toast.success("Archivo subido");
      }
    },
    [handleFileUpload, curriculumEntries]
  );

  const handleDeleteFile = useCallback(
    async (entryIdx: number, fileId: string) => {
      const file = curriculumEntries[entryIdx].files.find((f) => f.id === fileId);
      if (!file) return;

      const path = file.file_path.split("/curriculum-files/")[1]?.split("?")[0];
      if (path) {
        await supabaseRef.current.storage.from("curriculum-files").remove([decodeURIComponent(path)]);
      }

      await supabaseRef.current.from("curriculum_files").delete().eq("id", fileId);

      const updated = [...curriculumEntries];
      updated[entryIdx].files = updated[entryIdx].files.filter((f) => f.id !== fileId);
      setCurriculumEntries(updated);
    },
    [curriculumEntries]
  );

  const openTemario = (subject: Subject) => {
    setSelectedSubject(subject);
    setTemarioSubject(subject.id);
    setTemarioClassroom("");
    setCurriculumEntries([]);
    initialEntriesRef.current = [];
    setTemarioOpen(true);
  };

  const hasTemarioChanges = useCallback(() => {
    const initial = initialEntriesRef.current;
    if (initial.length !== curriculumEntries.length) return true;
    for (let i = 0; i < curriculumEntries.length; i++) {
      const cur = curriculumEntries[i];
      const ini = initial[i];
      if (cur.content !== ini.content || cur.files.length !== ini.files.length) return true;
    }
    return false;
  }, [curriculumEntries]);

  const handleCloseTemario = useCallback(() => {
    if (hasTemarioChanges()) {
      setTemarioDirtyConfirm(true);
    } else {
      setTemarioOpen(false);
    }
  }, [hasTemarioChanges]);

  const confirmCloseTemario = useCallback(() => {
    setTemarioDirtyConfirm(false);
    setTemarioOpen(false);
  }, []);

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
      initialEntriesRef.current = JSON.parse(JSON.stringify(curriculumEntries));
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
      await supabaseRef.current.from("subjects").delete().eq("id", selectedSubject.id);
      toast.success("Materia eliminada");
      setDeleteDialogOpen(false);
      setSelectedSubject(null);
      fetchData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error?.message || "Error al eliminar");
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
      {loading ? (<ShimmerGrid count={6} />) : subjects.length === 0 ? (
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
          searchPlaceholder="Buscar por nombre o código..."
          searchKeys={["name", "code"]}
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
          onClose={handleCloseTemario}
          title={`Temario: ${selectedSubject?.name || ""}`}
          size="xl"
          footer={
            <>
              <Button variant="outline" onClick={handleCloseTemario}>
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
              <p className="text-sm text-slate-500 text-center py-8">
                Cargando temario...
              </p>
            )}

            {temarioClassroom && !loadingTemario && (
              <div className="space-y-6">
                {curriculumEntries.map((entry, idx) => (
                  <div
                    key={entry.periodId}
                    className="border border-slate-200 rounded-xl overflow-hidden"
                  >
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-900">
                        {idx + 1}. {entry.periodName}
                      </h4>
                    </div>
                    <RichTextEditor
                      content={entry.content}
                      onChange={(html) => {
                        const updated = [...curriculumEntries];
                        updated[idx].content = html;
                        setCurriculumEntries(updated);
                      }}
                      placeholder={`Escribe el contenido temático para ${entry.periodName.toLowerCase()}...`}
                      files={entry.files}
                      onFileUpload={handleUploadFile(idx)}
                      onFileDelete={(fileId) => handleDeleteFile(idx, fileId)}
                    />
                  </div>
                ))}
              </div>
            )}

            {!temarioClassroom && (
              <p className="text-sm text-slate-400 text-center py-8">
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
        isOpen={temarioDirtyConfirm}
        onClose={() => setTemarioDirtyConfirm(false)}
        onConfirm={confirmCloseTemario}
        title="Salir del editor"
        message="Tienes cambios sin guardar en el temario. ¿Deseas salir sin guardar?"
        confirmLabel="Salir sin guardar"
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Materia"
        message={`¿Eliminar ${selectedSubject?.name}?`}
        details={["Todas las asignaciones a salones", "Las tareas asociadas", "Las entregas y calificaciones", "Los horarios de esta materia"]}
        isLoading={isSubmitting}
      />
    </div>
  );
}
