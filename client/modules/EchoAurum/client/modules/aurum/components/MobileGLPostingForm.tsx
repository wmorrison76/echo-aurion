import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { useGLOperations } from "../hooks/useGLOperations";
interface MobileGLPostingFormProps {
  entityId: string;
  onSuccess?: () => void;
}
export function MobileGLPostingForm({
  entityId,
  onSuccess,
}: MobileGLPostingFormProps) {
  const { createJournalEntry, loading, error } = useGLOperations();
  const [entryType, setEntryType] = useState("debit");
  const [accountCode, setAccountCode] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [lineItems, setLineItems] = useState<
    Array<{ account: string; debit: number; credit: number }>
  >([]);
  const [success, setSuccess] = useState(false);
  const handleAddLineItem = () => {
    if (!accountCode || !amount) return;
    const newItem = {
      account: accountCode,
      debit: entryType === "debit" ? parseFloat(amount) : 0,
      credit: entryType === "credit" ? parseFloat(amount) : 0,
    };
    setLineItems([...lineItems, newItem]);
    setAccountCode("");
    setAmount("");
    setEntryType("debit");
  };
  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };
  const totalDebits = lineItems.reduce((sum, item) => sum + item.debit, 0);
  const totalCredits = lineItems.reduce((sum, item) => sum + item.credit, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  const handleSubmit = async () => {
    if (!isBalanced) {
      alert("Journal entry must be balanced");
      return;
    }
    try {
      await createJournalEntry({
        entity_id: entityId,
        lines: lineItems,
        description: description || "Mobile entry",
        entry_date: new Date().toISOString(),
      });
      setSuccess(true);
      setLineItems([]);
      setDescription("");
      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
      }, 2000);
    } catch (err) {
      console.error("Failed to create journal entry", err);
    }
  };
  return (
    <div className="w-full space-y-4">
      {" "}
      <Card className="border-0 sm:border">
        {" "}
        <CardHeader className="pb-3 sm:pb-6">
          {" "}
          <CardTitle className="text-lg sm:text-xl">
            Quick GL Entry
          </CardTitle>{" "}
          <CardDescription className="text-xs sm:text-sm">
            {" "}
            Mobile-optimized journal entry form{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-4">
          {" "}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              {" "}
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />{" "}
              <span className="text-sm text-green-800">
                {" "}
                Entry posted successfully{" "}
              </span>{" "}
            </div>
          )}{" "}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              {" "}
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />{" "}
              <div className="text-sm text-red-800">{error.message}</div>{" "}
            </div>
          )}{" "}
          <div className="space-y-3">
            {" "}
            <div>
              {" "}
              <label className="text-xs sm:text-sm font-medium">
                {" "}
                Description{" "}
              </label>{" "}
              <Textarea
                placeholder="Entry description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                className="h-16 sm:h-20 text-sm"
              />{" "}
            </div>{" "}
            <div className="bg-surface dark:bg-gray-900 rounded-lg p-3 space-y-3">
              {" "}
              <div className="text-xs sm:text-sm font-semibold">
                {" "}
                Add Line Items{" "}
              </div>{" "}
              <div className="grid grid-cols-3 gap-2">
                {" "}
                <div>
                  {" "}
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {" "}
                    Account{" "}
                  </label>{" "}
                  <Input
                    placeholder="100"
                    value={accountCode}
                    onChange={(e) => setAccountCode(e.target.value)}
                    disabled={loading}
                    className="text-sm h-9"
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {" "}
                    Type{" "}
                  </label>{" "}
                  <Select
                    value={entryType}
                    onValueChange={setEntryType}
                    disabled={loading}
                  >
                    {" "}
                    <SelectTrigger className="text-sm h-9">
                      {" "}
                      <SelectValue />{" "}
                    </SelectTrigger>{" "}
                    <SelectContent>
                      {" "}
                      <SelectItem value="debit">Debit</SelectItem>{" "}
                      <SelectItem value="credit">Credit</SelectItem>{" "}
                    </SelectContent>{" "}
                  </Select>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {" "}
                    Amount{" "}
                  </label>{" "}
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={loading}
                    className="text-sm h-9"
                  />{" "}
                </div>{" "}
              </div>{" "}
              <Button
                onClick={handleAddLineItem}
                disabled={loading || !accountCode || !amount}
                variant="outline"
                size="sm"
                className="w-full text-xs h-8"
              >
                {" "}
                <Plus className="w-3 h-3 mr-1" /> Add Line{" "}
              </Button>{" "}
            </div>{" "}
            {lineItems.length > 0 && (
              <div className="space-y-2 bg-surface dark:bg-gray-900 rounded-lg p-3">
                {" "}
                <div className="text-xs sm:text-sm font-semibold mb-2">
                  {" "}
                  Line Items{" "}
                </div>{" "}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {" "}
                  {lineItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-background dark:bg-gray-800 p-2 rounded text-xs"
                    >
                      {" "}
                      <div className="flex-1">
                        {" "}
                        <div className="font-medium">
                          {" "}
                          Account {item.account}{" "}
                        </div>{" "}
                        <div className="text-muted-foreground">
                          {" "}
                          {item.debit > 0
                            ? `Dr ${item.debit.toFixed(2)}`
                            : `Cr ${item.credit.toFixed(2)}`}{" "}
                        </div>{" "}
                      </div>{" "}
                      <Button
                        onClick={() => handleRemoveLineItem(index)}
                        variant="ghost"
                        size="sm"
                        disabled={loading}
                        className="h-6 w-6 p-0"
                      >
                        {" "}
                        <X className="w-4 h-4" />{" "}
                      </Button>{" "}
                    </div>
                  ))}{" "}
                </div>{" "}
                <div className="border-t pt-2 text-xs">
                  {" "}
                  <div className="flex justify-between">
                    {" "}
                    <span>Total Debits:</span>{" "}
                    <span className="font-medium">
                      {" "}
                      ${totalDebits.toFixed(2)}{" "}
                    </span>{" "}
                  </div>{" "}
                  <div className="flex justify-between">
                    {" "}
                    <span>Total Credits:</span>{" "}
                    <span className="font-medium">
                      {" "}
                      ${totalCredits.toFixed(2)}{" "}
                    </span>{" "}
                  </div>{" "}
                  <div
                    className={`flex justify-between font-semibold mt-1 ${isBalanced ? "text-green-600" : "text-red-600"}`}
                  >
                    {" "}
                    <span>Balance:</span>{" "}
                    <span>${(totalDebits - totalCredits).toFixed(2)}</span>{" "}
                  </div>{" "}
                </div>{" "}
              </div>
            )}{" "}
          </div>{" "}
          <Button
            onClick={handleSubmit}
            disabled={loading || lineItems.length === 0 || !isBalanced}
            className="w-full h-10 text-sm font-medium"
          >
            {" "}
            {loading ? (
              <>
                {" "}
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                Posting...{" "}
              </>
            ) : (
              <>
                {" "}
                <CheckCircle2 className="w-4 h-4 mr-2" /> Post Entry{" "}
              </>
            )}{" "}
          </Button>{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
