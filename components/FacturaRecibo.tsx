"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { useRef } from "react";

interface FacturaReciboProps {
  open: boolean;
  onClose: () => void;
  cuota: {
    IdCuota: number;
    NombreSocio: string;
    Periodo: string;
    Monto: number;
    FechaVencimiento: string;
    Estado: number;
    FechaPago?: string;
    DNI?: string;
    Email?: string;
    TipoMembresia?: string;
  };
}

export default function FacturaRecibo({ open, onClose, cuota }: FacturaReciboProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const isPagada = cuota.Estado === 1;
  const numeroComprobante = `${isPagada ? "R" : "F"}-${String(cuota.IdCuota).padStart(8, "0")}`;
  
  // Fecha de emisión
  const fechaEmision = isPagada 
    ? new Date(cuota.FechaPago!) 
    : new Date();

  // Calcular recargo por mora (10% por mes vencido)
  const fechaVencimiento = new Date(cuota.FechaVencimiento);
  const hoy = new Date();
  const estaVencida = !isPagada && hoy > fechaVencimiento;
  
  // Calcular meses vencidos
  let mesesVencidos = 0;
  if (estaVencida) {
    mesesVencidos =
      (hoy.getFullYear() - fechaVencimiento.getFullYear()) * 12 +
      (hoy.getMonth() - fechaVencimiento.getMonth());
  }
  
  const porcentajeRecargo = 0.10;
  const recargo = estaVencida ? cuota.Monto * porcentajeRecargo * mesesVencidos : 0;
  const montoTotal = cuota.Monto + recargo;

  const handleDownload = () => {
    if (contentRef.current) {
      // Usar html2canvas o jsPDF para generar PDF
      import("html2canvas").then((html2canvas) => {
        import("jspdf").then((jsPDF) => {
          const element = contentRef.current!;
          
          html2canvas.default(element, {
            scale: 2,
            logging: false,
            backgroundColor: "#ffffff",
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
            pdf.save(`${isPagada ? "Recibo" : "Factura"}_${numeroComprobante}.pdf`);
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
            <span>{isPagada ? "Recibo de Pago" : "Factura"}</span>
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
              {/* Datos del Club */}
              <div>
                <h2 className="text-2xl font-bold mb-2">CLUB MASTER</h2>
                <p className="text-sm">
                  <strong>CUIT:</strong> 30-12345678-9<br />
                  <strong>Dirección:</strong> Av. Principal 123<br />
                  <strong>Ciudad:</strong> Rosario<br />
                  <strong>Tel:</strong> (011) 1234-5678<br />
                  <strong>Email:</strong> info@clubmaster.com
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

          {/* Datos del Cliente/Socio */}
          <div className="border-2 border-black p-4 mb-4">
            <h3 className="font-bold mb-2 border-b border-gray-300 pb-2">
              DATOS DEL SOCIO
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Apellido y Nombre:</strong> {cuota.NombreSocio}</p>
                <p><strong>DNI:</strong> {cuota.DNI || "N/A"}</p>
              </div>
              <div>
                <p><strong>Email:</strong> {cuota.Email || "N/A"}</p>
                <p><strong>Condición IVA:</strong> Consumidor Final</p>
              </div>
            </div>
          </div>

          {/* Detalle de la Cuota */}
          <div className="border-2 border-black mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-gray-100">
                  <th className="text-left p-2 border-r border-black">Código</th>
                  <th className="text-left p-2 border-r border-black">Descripción</th>
                  <th className="text-center p-2 border-r border-black">Cantidad</th>
                  <th className="text-right p-2 border-r border-black">Precio Unit.</th>
                  <th className="text-right p-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="p-2 border-r border-black">CUOTA-{cuota.Periodo.replace(/\s/g, "")}</td>
                  <td className="p-2 border-r border-black">
                    <strong>Cuota Social - {cuota.Periodo}</strong><br />
                    Membresía: {cuota.TipoMembresia || "Estándar"}
                  </td>
                  <td className="text-center p-2 border-r border-black">1</td>
                  <td className="text-right p-2 border-r border-black">
                    $ {cuota.Monto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="text-right p-2">
                    $ {cuota.Monto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                {/* Recargo por mora si aplica */}
                {estaVencida && recargo > 0 && (
                  <tr className="border-b border-gray-300 bg-orange-50">
                    <td className="p-2 border-r border-black">RECARGO</td>
                    <td className="p-2 border-r border-black">
                      <strong>Recargo por mora ({mesesVencidos} mes{mesesVencidos > 1 ? "es" : ""} × 10%)</strong><br />
                      <span className="text-xs text-orange-600">
                        Vencido el {new Date(cuota.FechaVencimiento).toLocaleDateString("es-AR")}
                      </span>
                    </td>
                    <td className="text-center p-2 border-r border-black">{mesesVencidos}</td>
                    <td className="text-right p-2 border-r border-black">
                      $ {(cuota.Monto * porcentajeRecargo).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-right p-2">
                      $ {recargo.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
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
                  <p><strong>Fecha de Pago:</strong> {new Date(cuota.FechaPago!).toLocaleDateString("es-AR")}</p>
                  <p><strong>Método de Pago:</strong> Efectivo / Transferencia</p>
                  <p className="mt-2 text-green-600 font-semibold">✓ PAGO RECIBIDO</p>
                </>
              ) : (
                <>
                  <p><strong>Fecha de Vencimiento:</strong> {new Date(cuota.FechaVencimiento).toLocaleDateString("es-AR")}</p>
                  <p className="mt-2 text-orange-600 font-semibold">⚠ PENDIENTE DE PAGO</p>
                </>
              )}
            </div>

            {/* Totales */}
            <div className="border-2 border-black">
              <div className="flex justify-between p-2 border-b border-black">
                <span className="font-semibold">Subtotal:</span>
                <span>$ {cuota.Monto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {estaVencida && recargo > 0 && (
                <div className="flex justify-between p-2 border-b border-black bg-orange-50">
                  <span className="font-semibold text-orange-600">
                    Recargo por mora ({mesesVencidos} mes{mesesVencidos > 1 ? "es" : ""} × 10%):
                  </span>
                  <span className="text-orange-600">$ {recargo.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
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
                <span>$ {montoTotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* CAE (Código de Autorización Electrónica) - Simulado */}
          <div className="border-2 border-black p-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p><strong>CAE N°:</strong> 7234567890123</p>
              </div>
              <div>
                <p><strong>Fecha de Vto. de CAE:</strong> {new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString("es-AR")}</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-xs">||| || ||| | || |||| | ||| |||</p>
                <p className="text-xs">Código de barras (simulado)</p>
              </div>
            </div>
          </div>

          {/* Pie de página */}
          <div className="mt-4 text-center text-xs text-gray-600">
            <p>Este comprobante es válido como factura. Verifique su autenticidad en www.afip.gob.ar</p>
            <p className="mt-1">
              {isPagada 
                ? "Documento no válido como crédito fiscal - Solo comprobante de pago"
                : "Documento no válido como crédito fiscal"
              }
            </p>
          </div>
        </div>

        {/* Estilos de impresión */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print\\:block, .print\\:block * {
              visibility: visible;
            }
            button {
              display: none !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
