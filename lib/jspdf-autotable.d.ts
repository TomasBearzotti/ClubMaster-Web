// Declaración de tipos para jspdf-autotable
import "jspdf"

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
    lastAutoTable?: {
      finalY: number
    }
  }
}
