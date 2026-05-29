export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: "admin" | "teacher" | "student";
          avatar: string | null;
          phone: string | null;
          status: "active" | "inactive" | "suspended";
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role?: "admin" | "teacher" | "student";
          avatar?: string | null;
          phone?: string | null;
          status?: "active" | "inactive" | "suspended";
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: "admin" | "teacher" | "student";
          avatar?: string | null;
          phone?: string | null;
          status?: "active" | "inactive" | "suspended";
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          user_id: string | null;
          student_code: string;
          first_name: string;
          last_name: string;
          birth_date: string | null;
          gender: "male" | "female" | null;
          address: string | null;
          phone: string | null;
          emergency_contact: string | null;
          emergency_phone: string | null;
          enrollment_date: string | null;
          classroom_id: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          student_code: string;
          first_name: string;
          last_name: string;
          birth_date?: string | null;
          gender?: "male" | "female" | null;
          address?: string | null;
          phone?: string | null;
          emergency_contact?: string | null;
          emergency_phone?: string | null;
          enrollment_date?: string | null;
          classroom_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          student_code?: string;
          first_name?: string;
          last_name?: string;
          birth_date?: string | null;
          gender?: "male" | "female" | null;
          address?: string | null;
          phone?: string | null;
          emergency_contact?: string | null;
          emergency_phone?: string | null;
          enrollment_date?: string | null;
          classroom_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      teachers: {
        Row: {
          id: string;
          user_id: string | null;
          employee_code: string;
          first_name: string;
          last_name: string;
          specialty: string | null;
          phone: string | null;
          hire_date: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          employee_code: string;
          first_name: string;
          last_name: string;
          specialty?: string | null;
          phone?: string | null;
          hire_date?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          employee_code?: string;
          first_name?: string;
          last_name?: string;
          specialty?: string | null;
          phone?: string | null;
          hire_date?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      academic_years: {
        Row: {
          id: string;
          year: number;
          start_date: string;
          end_date: string;
          is_active: boolean;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          year: number;
          start_date: string;
          end_date: string;
          is_active?: boolean;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          year?: number;
          start_date?: string;
          end_date?: string;
          is_active?: boolean;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      school_periods: {
        Row: {
          id: string;
          academic_year_id: string | null;
          name: string;
          start_date: string;
          end_date: string;
          order: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          academic_year_id?: string | null;
          name: string;
          start_date: string;
          end_date: string;
          order: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          academic_year_id?: string | null;
          name?: string;
          start_date?: string;
          end_date?: string;
          order?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      classrooms: {
        Row: {
          id: string;
          academic_year_id: string | null;
          name: string;
          grade_level: string;
          capacity: number;
          location: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          academic_year_id?: string | null;
          name: string;
          grade_level: string;
          capacity?: number;
          location?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          academic_year_id?: string | null;
          name?: string;
          grade_level?: string;
          capacity?: number;
          location?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      subjects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          code: string;
          credits: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          code: string;
          credits?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          code?: string;
          credits?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      classroom_subjects: {
        Row: {
          id: string;
          classroom_id: string | null;
          subject_id: string | null;
          curriculum: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          classroom_id?: string | null;
          subject_id?: string | null;
          curriculum?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          classroom_id?: string | null;
          subject_id?: string | null;
          curriculum?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      curriculum_entries: {
        Row: {
          id: string;
          classroom_subject_id: string | null;
          school_period_id: string | null;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          classroom_subject_id?: string | null;
          school_period_id?: string | null;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          classroom_subject_id?: string | null;
          school_period_id?: string | null;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      curriculum_files: {
        Row: {
          id: string;
          curriculum_entry_id: string;
          file_name: string;
          file_path: string;
          file_size: number | null;
          content_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          curriculum_entry_id: string;
          file_name: string;
          file_path: string;
          file_size?: number | null;
          content_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          curriculum_entry_id?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number | null;
          content_type?: string | null;
          created_at?: string;
        };
      };
      teacher_assignments: {
        Row: {
          id: string;
          teacher_id: string | null;
          classroom_id: string | null;
          subject_id: string | null;
          school_period_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id?: string | null;
          classroom_id?: string | null;
          subject_id?: string | null;
          school_period_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string | null;
          classroom_id?: string | null;
          subject_id?: string | null;
          school_period_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      schedules: {
        Row: {
          id: string;
          classroom_id: string | null;
          subject_id: string | null;
          teacher_id: string | null;
          teacher_assignment_id: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          location: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          classroom_id?: string | null;
          subject_id?: string | null;
          teacher_id?: string | null;
          teacher_assignment_id?: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          classroom_id?: string | null;
          subject_id?: string | null;
          teacher_id?: string | null;
          teacher_assignment_id?: string | null;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          instructions: string | null;
          teacher_id: string | null;
          classroom_subject_id: string | null;
          school_period_id: string | null;
          due_date: string;
          max_score: number;
          allow_late: boolean;
          status: "draft" | "published" | "closed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          instructions?: string | null;
          teacher_id?: string | null;
          classroom_subject_id?: string | null;
          school_period_id?: string | null;
          due_date: string;
          max_score?: number;
          allow_late?: boolean;
          status?: "draft" | "published" | "closed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          instructions?: string | null;
          teacher_id?: string | null;
          classroom_subject_id?: string | null;
          school_period_id?: string | null;
          due_date?: string;
          max_score?: number;
          allow_late?: boolean;
          status?: "draft" | "published" | "closed";
          created_at?: string;
          updated_at?: string;
        };
      };
      task_attachments: {
        Row: {
          id: string;
          task_id: string | null;
          file_path: string;
          file_name: string;
          file_type: string | null;
          file_size: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id?: string | null;
          file_path: string;
          file_name: string;
          file_type?: string | null;
          file_size?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string | null;
          file_path?: string;
          file_name?: string;
          file_type?: string | null;
          file_size?: number | null;
          created_at?: string;
        };
      };
      submissions: {
        Row: {
          id: string;
          task_id: string | null;
          student_id: string | null;
          file_path: string;
          file_name: string;
          submitted_at: string;
          comments: string | null;
          score: number | null;
          teacher_comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id?: string | null;
          student_id?: string | null;
          file_path: string;
          file_name: string;
          submitted_at?: string;
          comments?: string | null;
          score?: number | null;
          teacher_comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string | null;
          student_id?: string | null;
          file_path?: string;
          file_name?: string;
          submitted_at?: string;
          comments?: string | null;
          score?: number | null;
          teacher_comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      grades: {
        Row: {
          id: string;
          student_id: string | null;
          teacher_id: string | null;
          classroom_subject_id: string | null;
          school_period_id: string | null;
          score: number;
          comments: string | null;
          graded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          teacher_id?: string | null;
          classroom_subject_id?: string | null;
          school_period_id?: string | null;
          score: number;
          comments?: string | null;
          graded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          teacher_id?: string | null;
          classroom_subject_id?: string | null;
          school_period_id?: string | null;
          score?: number;
          comments?: string | null;
          graded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      report_cards: {
        Row: {
          id: string;
          student_id: string | null;
          school_period_id: string | null;
          classroom_id: string | null;
          average: number | null;
          rank: number | null;
          attendance: number | null;
          observations: string | null;
          status: "draft" | "published";
          generated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          school_period_id?: string | null;
          classroom_id?: string | null;
          average?: number | null;
          rank?: number | null;
          attendance?: number | null;
          observations?: string | null;
          status?: "draft" | "published";
          generated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          school_period_id?: string | null;
          classroom_id?: string | null;
          average?: number | null;
          rank?: number | null;
          attendance?: number | null;
          observations?: string | null;
          status?: "draft" | "published";
          generated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      news: {
        Row: {
          id: string;
          title: string;
          content: string;
          excerpt: string | null;
          author_id: string | null;
          image: string | null;
          is_published: boolean;
          published_at: string | null;
          category: string | null;
          featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          excerpt?: string | null;
          author_id?: string | null;
          image?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          category?: string | null;
          featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          excerpt?: string | null;
          author_id?: string | null;
          image?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          category?: string | null;
          featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          start_date: string;
          end_date: string | null;
          location: string | null;
          is_all_day: boolean;
          color: string | null;
          event_type: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          start_date: string;
          end_date?: string | null;
          location?: string | null;
          is_all_day?: boolean;
          color?: string | null;
          event_type?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string | null;
          location?: string | null;
          is_all_day?: boolean;
          color?: string | null;
          event_type?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          priority: "low" | "normal" | "high" | "urgent";
          target_role: string | null;
          is_active: boolean;
          expires_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          priority?: "low" | "normal" | "high" | "urgent";
          target_role?: string | null;
          is_active?: boolean;
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          priority?: "low" | "normal" | "high" | "urgent";
          target_role?: string | null;
          is_active?: boolean;
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
