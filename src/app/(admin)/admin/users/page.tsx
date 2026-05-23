"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import type { Tables } from "@/types/database";

type User = Tables<"users">;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "student" as "admin" | "teacher" | "student",
    status: "active" as "active" | "inactive" | "suspended",
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status as "active" | "inactive" | "suspended",
      });
    } else {
      setSelectedUser(null);
      setFormData({ name: "", email: "", role: "student", status: "active" });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = selectedUser ? `/api/admin/users?id=${selectedUser.id}` : "/api/admin/users";
      const method = selectedUser ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Error");

      toast.success(selectedUser ? "Usuario actualizado" : "Usuario creado con contraseña temporal: demo123");
      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error saving user:', err);
      toast.error("Error al guardar usuario");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedUser.id }),
      });

      if (!res.ok) throw new Error("Error");

      setDeleteDialogOpen(false);
      setSelectedUser(null);
      toast.success("Usuario eliminado");
      fetchData();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error("Error al eliminar usuario");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: selectedUser.email, action: "reset_password" }),
      });

      if (!res.ok) throw new Error("Error");

      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
      toast.success("Correo de recuperación enviado");
    } catch (err) {
      console.error('Error sending recovery email:', err);
      toast.error("Error al enviar correo de recuperación");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "name", header: "Nombre" },
    { key: "email", header: "Correo" },
    { key: "role", header: "Rol" },
    { key: "status", header: "Estado" },
  ];

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Gestionar cuentas de usuarios"
        actionLabel="Nuevo Usuario"
        onAction={() => handleOpenModal()}
      />

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <p className="text-center text-gray-500">Cargando...</p>
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          title="No hay usuarios"
          description="Comienza creando el primer usuario"
          actionLabel="Nuevo Usuario"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <DataTable
          data={users}
          columns={columns}
          onEdit={handleOpenModal}
          onDelete={(item) => {
            setSelectedUser(item);
            setDeleteDialogOpen(true);
          }}
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedUser ? "Editar Usuario" : "Nuevo Usuario"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              {selectedUser ? "Guardar Cambios" : "Crear Usuario"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          {!selectedUser && (
            <Input
              label="Correo Electrónico"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Rol"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as "admin" | "teacher" | "student" })}
              options={[
                { value: "admin", label: "Administrador" },
                { value: "teacher", label: "Profesor" },
                { value: "student", label: "Estudiante" },
              ]}
            />
            <Select
              label="Estado"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" | "suspended" })}
              options={[
                { value: "active", label: "Activo" },
                { value: "inactive", label: "Inactivo" },
                { value: "suspended", label: "Suspendido" },
              ]}
            />
          </div>
          {!selectedUser && (
            <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              La contraseña temporal será: <strong>demo123</strong>
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Usuario"
        message={`¿Está seguro de eliminar a ${selectedUser?.name}? Esta acción eliminará la cuenta de auth y no se puede deshacer.`}
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={resetPasswordDialogOpen}
        onClose={() => setResetPasswordDialogOpen(false)}
        onConfirm={handleResetPassword}
        title="Restablecer Contraseña"
        message={`Se enviará un correo a ${selectedUser?.email} con enlace para restablecer la contraseña.`}
        isLoading={isSubmitting}
        confirmLabel="Enviar correo"
      />
    </div>
  );
}