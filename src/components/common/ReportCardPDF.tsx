"use client";

export interface GradeItem {
  subject: string;
  score: number | null;
  comments: string | null;
}

export interface ReportCardPDFData {
  studentName: string;
  classroomName: string;
  gradeLevel: string;
  periodName: string;
  academicYear: number;
  grades: GradeItem[];
  average: number | null;
  rank: number | null;
  attendance: number | null;
  generatedAt: string;
}

function renderPDFHTML(data: ReportCardPDFData): string {
  const rows = data.grades
    .map(
      (g) => `
    <tr>
      <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:13px;">${g.subject}</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:center;font-size:13px;font-weight:600;">${g.score != null ? g.score.toFixed(1) : "-"}</td>
      <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;color:#475569;">${g.comments || "-"}</td>
    </tr>`
    )
    .join("");

  return `
<div style="font-family:Georgia,serif;color:#1e293b;background:#fff;padding:48px 40px;width:100%;box-sizing:border-box;">
  <div style="text-align:center;border-bottom:3px solid #1d4ed8;padding-bottom:18px;margin-bottom:28px;">
    <h1 style="font-size:30px;font-weight:700;color:#1d4ed8;margin:0;letter-spacing:1px;">EducTask</h1>
    <h2 style="font-size:17px;color:#64748b;margin:8px 0 0;font-weight:400;">Boletín de Calificaciones</h2>
  </div>

  <div style="margin-bottom:24px;font-size:13px;line-height:1.8;">
    <p style="margin:4px 0;"><strong>Estudiante:</strong> ${data.studentName}</p>
    <p style="margin:4px 0;"><strong>Salón:</strong> ${data.classroomName} ${data.gradeLevel ? `- ${data.gradeLevel}` : ""}</p>
    <p style="margin:4px 0;"><strong>Período:</strong> ${data.periodName}</p>
    <p style="margin:4px 0;"><strong>Año Académico:</strong> ${data.academicYear}</p>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="padding:10px 12px;border:1px solid #e2e8f0;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Materia</th>
        <th style="padding:10px 12px;border:1px solid #e2e8f0;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Calificación</th>
        <th style="padding:10px 12px;border:1px solid #e2e8f0;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Comentario</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div style="display:flex;justify-content:space-between;padding:16px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;font-size:14px;">
    <div><strong>Promedio General:</strong> <span style="font-size:16px;color:#1d4ed8;">${data.average != null ? data.average.toFixed(1) : "-"}</span></div>
    <div><strong>Ranking:</strong> <span style="font-size:16px;color:#1d4ed8;">${data.rank != null ? `#${data.rank}` : "-"}</span></div>
    <div><strong>Asistencia:</strong> <span style="font-size:16px;color:#1d4ed8;">${data.attendance != null ? `${data.attendance}%` : "N/A"}</span></div>
  </div>

  <div style="margin-top:48px;font-size:12px;color:#64748b;text-align:center;">
    <p style="margin:0 0 36px;">Fecha de emisión: ${data.generatedAt}</p>
    <div style="display:flex;justify-content:space-between;gap:40px;padding:0 20px;">
      <div style="border-top:1px solid #94a3b8;padding-top:10px;width:180px;text-align:center;">
        <p style="margin:0;font-weight:600;font-size:12px;">Firma del Director</p>
      </div>
      <div style="border-top:1px solid #94a3b8;padding-top:10px;width:180px;text-align:center;">
        <p style="margin:0;font-weight:600;font-size:12px;">Sello Institucional</p>
      </div>
    </div>
  </div>
</div>`;
}

export function ReportCardPDFContent({ data }: { data: ReportCardPDFData }) {
  return (
    <div className="bg-white text-slate-800" style={{ fontFamily: "Georgia, serif", padding: "48px 40px" }}>
      <div className="text-center border-b-[3px] border-b-blue-700 pb-[18px] mb-7">
        <h1 className="text-[30px] font-bold text-blue-700 m-0 tracking-wide">EducTask</h1>
        <h2 className="text-[17px] text-slate-500 mt-2 font-normal">Boletín de Calificaciones</h2>
      </div>

      <div className="mb-6 text-[13px] leading-relaxed space-y-1">
        <p><strong>Estudiante:</strong> {data.studentName}</p>
        <p><strong>Salón:</strong> {data.classroomName}{data.gradeLevel ? ` - ${data.gradeLevel}` : ""}</p>
        <p><strong>Período:</strong> {data.periodName}</p>
        <p><strong>Año Académico:</strong> {data.academicYear}</p>
      </div>

      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-slate-50">
            <th className="p-[10px_12px] border border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">Materia</th>
            <th className="p-[10px_12px] border border-slate-200 text-center text-[11px] uppercase tracking-wider text-slate-500">Calificación</th>
            <th className="p-[10px_12px] border border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">Comentario</th>
          </tr>
        </thead>
        <tbody>
          {data.grades.map((g, i) => (
            <tr key={i}>
              <td className="p-[10px_12px] border border-slate-200 text-[13px]">{g.subject}</td>
              <td className="p-[10px_12px] border border-slate-200 text-center text-[13px] font-semibold">
                {g.score != null ? g.score.toFixed(1) : "-"}
              </td>
              <td className="p-[10px_12px] border border-slate-200 text-xs text-slate-600">
                {g.comments || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg mb-6 text-sm">
        <div>
          <strong>Promedio General:</strong>{" "}
          <span className="text-base text-blue-700 font-semibold">
            {data.average != null ? data.average.toFixed(1) : "-"}
          </span>
        </div>
        <div>
          <strong>Ranking:</strong>{" "}
          <span className="text-base text-blue-700 font-semibold">
            {data.rank != null ? `#${data.rank}` : "-"}
          </span>
        </div>
        <div>
          <strong>Asistencia:</strong>{" "}
          <span className="text-base text-blue-700 font-semibold">
            {data.attendance != null ? `${data.attendance}%` : "N/A"}
          </span>
        </div>
      </div>

      <div className="mt-12 text-xs text-slate-500 text-center">
        <p className="mb-9">Fecha de emisión: {data.generatedAt}</p>
        <div className="flex justify-between gap-10 px-5">
          <div className="border-t border-slate-400 pt-[10px] w-[180px] text-center">
            <p className="m-0 font-semibold text-xs">Firma del Director</p>
          </div>
          <div className="border-t border-slate-400 pt-[10px] w-[180px] text-center">
            <p className="m-0 font-semibold text-xs">Sello Institucional</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function downloadReportCardPDF(
  data: ReportCardPDFData,
  filename: string
): Promise<void> {
  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.left = "-9999px";
  wrapper.style.top = "0";
  wrapper.style.width = "210mm";
  wrapper.innerHTML = renderPDFHTML(data);
  document.body.appendChild(wrapper);

  try {
    const html2pdf = (await import("html2pdf.js")).default;
    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
    };
    await html2pdf().set(opt).from(wrapper).save();
  } finally {
    document.body.removeChild(wrapper);
  }
}
