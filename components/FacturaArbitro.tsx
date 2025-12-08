"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { useRef } from "react";

interface FacturaArbitroProps {
  open: boolean;
  onClose: () => void;
  factura: {
    IdFactura: number;
    NombreArbitro: string;
    Monto: number;
    Estado: number; // 0: Programada, 1: Pendiente, 2: Pagada, 3: Cancelada
    FechaCreacion: string;
    FechaPago: string | null;
    MetodoPago: string | null;
    FechaPartido: string;
    HoraPartido: string;
    NombreTorneo: string;
    EquipoA?: string;
    EquipoB?: string;
    DNI?: string;
    Email?: string;
  };
}

export default function FacturaArbitro({ open, onClose, factura }: FacturaArbitroProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const isPagada = factura.Estado === 2;
  const numeroComprobante = `${isPagada ? "R" : "F"}-${String(factura.IdFactura).padStart(8, "0")}`;
  
  // Fecha de emisión
  const fechaEmision = isPagada 
    ? new Date(factura.FechaPago!) 
    : new Date(factura.FechaCreacion);

  const handleDownload = () => {
    if (contentRef.current) {
      // Usar html2canvas y jsPDF para generar PDF
      import("html2canvas").then((html2canvas) => {
        import("jspdf").then((jsPDF) => {
          const element = contentRef.current!;
          
          html2canvas.default(element, {
            scale: 2,
            useCORS: true,
            logging: false,
          }).then((canvas) => {
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF.default({
              orientation: "portrait",
              unit: "mm",
              format: "a4",
            });
            
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
            pdf.save(`${isPagada ? "Recibo" : "Factura"}_Arbitro_${numeroComprobante}.pdf`);
          });
        });
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isPagada ? "Recibo de Pago a Árbitro" : "Factura de Árbitro"}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Contenido de la Factura/Recibo */}
        <div 
          ref={contentRef} 
          className="bg-white p-8 print:p-8"
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          {/* Encabezado */}
          <div className="border-2 border-black p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Datos del Árbitro (Emisor) */}
              <div>
                <h2 className="text-2xl font-bold mb-2">{factura.NombreArbitro.toUpperCase()}</h2>
                <p className="text-sm">
                  <strong>Árbitro Profesional</strong><br />
                  <strong>DNI:</strong> {factura.DNI || "N/A"}<br />
                  <strong>Email:</strong> {factura.Email || "N/A"}<br />
                  <strong>Servicio:</strong> Arbitraje Deportivo
                </p>
              </div>

              {/* Tipo de Comprobante */}
              <div className="border-2 border-black flex flex-col items-center justify-center">
                <div className="text-5xl font-bold border-b-2 border-black w-full text-center py-2">
                  {isPagada ? "X" : "C"}
                </div>
                <div className="text-center py-2">
                  <p className="text-xs font-semibold">
                    {isPagada ? "RECIBO" : "FACTURA C"}
                  </p>
                  <p className="text-xs">
                    COD. {isPagada ? "99" : "11"}
                  </p>
                </div>
              </div>
            </div>

            {/* Número de Comprobante */}
            <div className="mt-4 border-t-2 border-black pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm">
                    <strong>Punto de Venta:</strong> 0001<br />
                    <strong>N° Comprobante:</strong> {numeroComprobante}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    <strong>Fecha de Emisión:</strong> {fechaEmision.toLocaleDateString("es-AR")}<br />
                    <strong>IVA:</strong> Responsable Inscripto
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Datos del Cliente (Club) */}
          <div className="border-2 border-black p-4 mb-4">
            <h3 className="font-bold mb-2 border-b border-gray-300 pb-2">
              DATOS DEL CLIENTE
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Razón Social:</strong> Club Master</p>
                <p><strong>CUIT:</strong> 30-12345678-9</p>
              </div>
              <div>
                <p><strong>Domicilio:</strong> Av. Principal 123, Rosario</p>
                <p><strong>Condición IVA:</strong> Responsable Inscripto</p>
              </div>
            </div>
          </div>

          {/* Detalle del Servicio */}
          <div className="border-2 border-black mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-200 border-b-2 border-black">
                  <th className="text-left p-2 border-r border-black">Código</th>
                  <th className="text-left p-2 border-r border-black">Descripción</th>
                  <th className="text-center p-2 border-r border-black">Cant.</th>
                  <th className="text-right p-2 border-r border-black">P. Unit.</th>
                  <th className="text-right p-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="p-2 border-r border-black">ARB-{factura.IdFactura}</td>
                  <td className="p-2 border-r border-black">
                    <strong>Servicio de Arbitraje</strong><br />
                    <span className="text-xs">
                      Torneo: {factura.NombreTorneo}<br />
                      Fecha: {new Date(factura.FechaPartido).toLocaleDateString("es-AR")} - {factura.HoraPartido}
                      {factura.EquipoA && factura.EquipoB && (
                        <><br />Partido: {factura.EquipoA} vs {factura.EquipoB}</>
                      )}
                    </span>
                  </td>
                  <td className="text-center p-2 border-r border-black">1</td>
                  <td className="text-right p-2 border-r border-black">
                    $ {factura.Monto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="text-right p-2">
                    $ {factura.Monto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                {/* Fila vacía para mantener estructura */}
                <tr className="border-b border-gray-300">
                  <td className="p-2 border-r border-black">&nbsp;</td>
                  <td className="p-2 border-r border-black">&nbsp;</td>
                  <td className="p-2 border-r border-black">&nbsp;</td>
                  <td className="p-2 border-r border-black">&nbsp;</td>
                  <td className="p-2">&nbsp;</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Información adicional */}
            <div className="border-2 border-black p-4 text-sm">
              <h4 className="font-bold mb-2">INFORMACIÓN ADICIONAL</h4>
              {isPagada ? (
                <>
                  <p><strong>Fecha de Pago:</strong> {new Date(factura.FechaPago!).toLocaleDateString("es-AR")}</p>
                  <p><strong>Método de Pago:</strong> {factura.MetodoPago}</p>
                  <p className="mt-2 text-green-600 font-semibold">✓ PAGO REALIZADO</p>
                </>
              ) : (
                <>
                  <p><strong>Fecha de Creación:</strong> {new Date(factura.FechaCreacion).toLocaleDateString("es-AR")}</p>
                  <p className="mt-2 text-orange-600 font-semibold">⚠ PENDIENTE DE PAGO</p>
                </>
              )}
            </div>

            {/* Totales */}
            <div className="border-2 border-black">
              <div className="flex justify-between p-2 border-b border-black">
                <span className="font-semibold">Subtotal:</span>
                <span>$ {factura.Monto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between p-2 border-b border-black">
                <span className="font-semibold">IVA (0%):</span>
                <span>$ 0,00</span>
              </div>
              <div className="flex justify-between p-2 border-b border-black">
                <span className="font-semibold">Otros Impuestos:</span>
                <span>$ 0,00</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-100 font-bold text-lg">
                <span>TOTAL:</span>
                <span>$ {factura.Monto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* CAE (Código de Autorización Electrónica) - Simulado */}
          <div className="border-2 border-black p-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <strong>CAE:</strong> 12345678901234
              </div>
              <div>
                <strong>Vto. CAE:</strong> 31/12/2025
              </div>
              <div className="text-right">
                <strong>Comprobante autorizado por AFIP</strong>
              </div>
            </div>
            <div className="mt-2 text-center">
              <div className="inline-block bg-white p-1 border border-black">
                ||||||||||||||||||||||||||||||||||||||||||||
              </div>
            </div>
          </div>

          {/* Pie de página */}
          <div className="mt-4 text-center text-xs text-gray-600">
            <p>Este comprobante es válido como factura original</p>
            <p className="mt-1">ClubMaster - Sistema de Gestión Deportiva</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
