"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";
import type { Tables } from "@/types/database";
import toast from "react-hot-toast";

type News = Tables<"news">;

export default function NewsPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabaseRef = useRef(createClient());

  const [formData, setFormData] = useState({ title: "", content: "", excerpt: "", image: "", category: "", is_published: false, featured: false, published_at: "" });

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabaseRef.current.from("news").select("*").order("created_at", { ascending: false });
      if (data) setNews(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (item?: News) => {
    if (item) {
      setSelectedNews(item);
      setFormData({ title: item.title, content: item.content, excerpt: item.excerpt || "", image: item.image || "", category: item.category || "", is_published: item.is_published, featured: item.featured, published_at: item.published_at ? new Date(item.published_at).toISOString().slice(0, 16) : "" });
    } else {
      setSelectedNews(null);
      setFormData({ title: "", content: "", excerpt: "", image: "", category: "", is_published: false, featured: false, published_at: "" });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const published_at = formData.published_at ? new Date(formData.published_at).toISOString() : (formData.is_published ? new Date().toISOString() : null);
      const data = {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || null,
        image: formData.image || null,
        category: formData.category || null,
        is_published: formData.is_published,
        featured: formData.featured,
        published_at,
      };
      if (selectedNews) {
        await supabaseRef.current.from("news").update(data).eq("id", selectedNews.id);
      } else {
        await supabaseRef.current.from("news").insert([data]);
      }
      toast.success(selectedNews ? "Noticia actualizada" : "Noticia creada");
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNews) return;
    setIsSubmitting(true);
    try {
      await supabaseRef.current.from("news").delete().eq("id", selectedNews.id);
      toast.success("Noticia eliminada");
      setDeleteDialogOpen(false);
      setSelectedNews(null);
      fetchData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error?.message || "Error al eliminar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "title", header: "Título" },
    { key: "category", header: "Categoría" },
    { key: "published_at", header: "Fecha", render: (item: News) => item.published_at ? formatDateTime(item.published_at) : "—" },
    { key: "is_published", header: "Publicado", render: (item: News) => item.is_published ? "Sí" : "No" },
    { key: "featured", header: "Destacado", render: (item: News) => item.featured ? "Sí" : "No" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Noticias" description="Gestionar noticias" actionLabel="Nueva Noticia" onAction={() => handleOpenModal()} />
      {!loading && news.length === 0 ? (
        <EmptyState title="No hay noticias" description="Comienza creando la primera noticia" actionLabel="Nueva Noticia" onAction={() => handleOpenModal()} />
      ) : (
        <DataTable isLoading={loading} data={news} columns={columns} searchPlaceholder="Buscar por título..." searchKeys={["title"]} onEdit={handleOpenModal} onDelete={(item) => { setSelectedNews(item); setDeleteDialogOpen(true); }} />
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedNews ? "Editar Noticia" : "Nueva Noticia"} footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSubmit} isLoading={isSubmitting}>{selectedNews ? "Guardar" : "Crear"}</Button></>}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Título" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contenido</label>
            <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" rows={4} value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} required />
          </div>
          <Input label="Extracto" value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} />
          <Input label="Categoría" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
          <Input label="Fecha de publicación" type="datetime-local" value={formData.published_at} onChange={(e) => setFormData({ ...formData, published_at: e.target.value })} />
          <Input label="URL de Imagen" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} />
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.is_published} onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-slate-700">Publicado</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.featured} onChange={(e) => setFormData({ ...formData, featured: e.target.checked })} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-slate-700">Destacado</span>
            </label>
          </div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDelete} title="Eliminar Noticia" message={`¿Eliminar "${selectedNews?.title}"?`} type="danger" isLoading={isSubmitting} />
    </div>
  );
}
