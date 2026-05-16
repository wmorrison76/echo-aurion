/** * Invoice Face Signature Display Panel * Shows detected color, orientation, and document type * Displays confidence scores and matching templates */ import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Eye } from "lucide-react";
import type { InvoiceFaceSignature } from "@/lib/invoice-face-recognition";
import type { TemplateMatchResult } from "@/lib/invoice-template-fingerprinting";
interface InvoiceFaceSignaturePanelProps {
  faceSignature: InvoiceFaceSignature | null;
  templateMatch: TemplateMatchResult | null;
  isLoading?: boolean;
}
export function InvoiceFaceSignaturePanel({
  faceSignature,
  templateMatch,
  isLoading = false,
}: InvoiceFaceSignaturePanelProps) {
  if (!faceSignature) {
    return (
      <Card className="border-border bg-surface">
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="text-sm">Face Signature</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <p className="text-sm text-cyan-300">
            {" "}
            Upload an invoice to extract face signature{" "}
          </p>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  return (
    <Card className="border-border bg-surface">
      {" "}
      <CardHeader>
        {" "}
        <CardTitle className="flex items-center justify-between text-sm">
          {" "}
          <span className="flex items-center gap-2">
            {" "}
            <Eye className="h-4 w-4 text-cyan-400" /> Face Signature{" "}
          </span>{" "}
          <Badge variant="outline" className="text-xs">
            {" "}
            {(faceSignature.confidence * 100).toFixed(0)}%{" "}
          </Badge>{" "}
        </CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-4">
        {" "}
        {/* Color Swatch */}{" "}
        <div>
          {" "}
          <p className="mb-2 text-xs font-medium text-cyan-100">
            {" "}
            Primary Color{" "}
          </p>{" "}
          <div className="flex items-center gap-3">
            {" "}
            <div
              className="h-12 w-12 rounded border border-slate-600"
              style={{
                backgroundColor: hsvToRgb(
                  faceSignature.primaryColorHsv.h,
                  faceSignature.primaryColorHsv.s,
                  faceSignature.primaryColorHsv.v,
                ),
              }}
            />{" "}
            <div>
              {" "}
              <p className="text-sm text-cyan-100">
                {" "}
                H: {faceSignature.primaryColorHsv.h}°{" "}
              </p>{" "}
              <p className="text-xs text-cyan-300">
                {" "}
                S: {faceSignature.primaryColorHsv.s}% V:{""}{" "}
                {faceSignature.primaryColorHsv.v}%{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        {/* Color Palette */}{" "}
        {faceSignature.colorPalette.length > 0 && (
          <div>
            {" "}
            <p className="mb-2 text-xs font-medium text-cyan-100">
              {" "}
              Color Palette{" "}
            </p>{" "}
            <div className="flex gap-2">
              {" "}
              {faceSignature.colorPalette.slice(0, 5).map((colorStr, i) => {
                const hsv = parseColorString(colorStr);
                return (
                  <div
                    key={i}
                    className="h-6 w-6 rounded border border-slate-600"
                    title={colorStr}
                    style={{ backgroundColor: hsvToRgb(hsv.h, hsv.s, hsv.v) }}
                  />
                );
              })}{" "}
            </div>{" "}
          </div>
        )}{" "}
        {/* Orientation & Document Type */}{" "}
        <div className="grid grid-cols-2 gap-3">
          {" "}
          <div>
            {" "}
            <p className="text-xs font-medium text-cyan-100">
              Orientation
            </p>{" "}
            <Badge className="mt-1 capitalize">
              {" "}
              {faceSignature.orientation}{" "}
            </Badge>{" "}
            <p className="mt-1 text-xs text-cyan-300">
              {" "}
              {(faceSignature.orientationConfidence * 100).toFixed(0)}%
              confidence{" "}
            </p>{" "}
          </div>{" "}
          <div>
            {" "}
            <p className="text-xs font-medium text-cyan-100">
              Document Type
            </p>{" "}
            <Badge className="mt-1 capitalize">
              {" "}
              {faceSignature.documentType}{" "}
            </Badge>{" "}
            <p className="mt-1 text-xs text-cyan-300">
              {" "}
              {(faceSignature.colorConfidence * 100).toFixed(0)}%
              confidence{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        {/* Fingerprint */}{" "}
        <div>
          {" "}
          <p className="text-xs font-medium text-cyan-100">Fingerprint</p>{" "}
          <code className="block rounded bg-slate-800 p-2 text-xs text-cyan-300">
            {" "}
            {faceSignature.fingerprint}{" "}
          </code>{" "}
        </div>{" "}
        {/* Template Match Results */}{" "}
        {templateMatch && (
          <div className="border-t border-border pt-4">
            {" "}
            <p className="mb-2 text-xs font-medium text-cyan-100">
              {" "}
              Template Match{" "}
            </p>{" "}
            {templateMatch.matched && templateMatch.primaryMatch ? (
              <div className="space-y-2">
                {" "}
                <div className="flex items-start gap-2 rounded bg-green-950 p-2">
                  {" "}
                  <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-green-400" />{" "}
                  <div className="flex-1">
                    {" "}
                    <p className="text-sm font-medium text-green-100">
                      {" "}
                      {templateMatch.primaryMatch.template.vendorName}{" "}
                    </p>{" "}
                    <p className="text-xs text-green-300">
                      {" "}
                      {templateMatch.primaryMatch.template.documentType} •{""}{" "}
                      {templateMatch.primaryMatch.template.orientation}{" "}
                    </p>{" "}
                    <div className="mt-2 flex gap-2">
                      {" "}
                      <div>
                        {" "}
                        <p className="text-xs text-green-400">
                          {" "}
                          Match:{""}{" "}
                          {(
                            templateMatch.primaryMatch.matchConfidence * 100
                          ).toFixed(0)}{" "}
                          %{" "}
                        </p>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <p className="text-xs text-green-400">
                          {" "}
                          Color:{""}{" "}
                          {(
                            templateMatch.primaryMatch.colorMatch * 100
                          ).toFixed(0)}{" "}
                          %{" "}
                        </p>{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
                {templateMatch.primaryMatch.reasons.length > 0 && (
                  <div className="text-xs text-green-300">
                    {" "}
                    {templateMatch.primaryMatch.reasons.map((reason, i) => (
                      <p key={i}>• {reason}</p>
                    ))}{" "}
                  </div>
                )}{" "}
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded bg-yellow-950 p-2">
                {" "}
                <AlertCircle className="mt-1 h-4 w-4 flex-shrink-0 text-yellow-400" />{" "}
                <div className="flex-1">
                  {" "}
                  <p className="text-xs text-yellow-300">
                    {" "}
                    {templateMatch.noMatchReason ||
                      "No matching template found"}{" "}
                  </p>{" "}
                  {templateMatch.alternativeMatches.length > 0 && (
                    <div className="mt-2">
                      {" "}
                      <p className="text-xs font-medium text-yellow-400">
                        {" "}
                        {templateMatch.alternativeMatches.length} alternative
                        match{" "}
                        {templateMatch.alternativeMatches.length !== 1
                          ? "es"
                          : ""}{" "}
                        :{" "}
                      </p>{" "}
                      <ul className="mt-1 space-y-1">
                        {" "}
                        {templateMatch.alternativeMatches
                          .slice(0, 3)
                          .map((alt, i) => (
                            <li key={i} className="text-xs text-yellow-300">
                              {" "}
                              • {alt.template.vendorName} ({" "}
                              {(alt.matchConfidence * 100).toFixed(0)}%){" "}
                            </li>
                          ))}{" "}
                      </ul>{" "}
                    </div>
                  )}{" "}
                </div>{" "}
              </div>
            )}{" "}
          </div>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
} /** * Convert HSV to RGB hex color */
function hsvToRgb(h: number, s: number, v: number): string {
  const c = (v / 100) * (s / 100);
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v / 100 - c;
  let r, g, b;
  if (h >= 0 && h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h >= 60 && h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h >= 120 && h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h >= 180 && h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h >= 240 && h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }
  const toHex = (value: number) => {
    const hex = Math.round((value + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
} /** * Parse color string like"H0S10V50" back to HSV */
function parseColorString(colorStr: string): {
  h: number;
  s: number;
  v: number;
} {
  const hMatch = colorStr.match(/H(\d+)/);
  const sMatch = colorStr.match(/S(\d+)/);
  const vMatch = colorStr.match(/V(\d+)/);
  return {
    h: hMatch ? parseInt(hMatch[1]) : 0,
    s: sMatch ? parseInt(sMatch[1]) : 0,
    v: vMatch ? parseInt(vMatch[1]) : 0,
  };
}
