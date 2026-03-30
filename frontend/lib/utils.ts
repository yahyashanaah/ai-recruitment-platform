import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(1)} ${units[index]}`;
}

export function formatPercent(value: number) {
  return `${Math.max(0, Math.min(value, 100)).toFixed(0)}%`;
}

export function formatDate(value: string | number | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function downloadTextFile(filename: string, content: string, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportHtmlToPrintWindow(title: string, content: string) {
  const win = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
  if (!win) {
    return;
  }

  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
          h1 { margin-bottom: 24px; }
          pre { white-space: pre-wrap; font-family: inherit; line-height: 1.6; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <pre>${content}</pre>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}
