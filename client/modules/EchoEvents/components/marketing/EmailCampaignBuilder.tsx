import React, { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
interface CampaignTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
}
interface EmailCampaignBuilderProps {
  onCampaignCreate?: (campaign: CampaignData) => void;
  isLoading?: boolean;
}
interface CampaignData {
  name: string;
  subject: string;
  content: string;
  recipientList: string[];
  sendTime: Date;
}
export const EmailCampaignBuilder: React.FC<EmailCampaignBuilderProps> = ({
  onCampaignCreate,
  isLoading = false,
}) => {
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [recipientList, setRecipientList] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [sendTime, setSendTime] = useState<Date>(new Date());
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const templates: CampaignTemplate[] = [
    {
      id: "post-event",
      name: "Post-Event Thank You",
      subject: "Thank You for Your Event",
      content: "Thank you for attending our event. We'd love your feedback!",
    },
    {
      id: "promotion",
      name: "Special Promotion",
      subject: "Exclusive Offer for You",
      content: "We have a special offer just for you...",
    },
    {
      id: "reminder",
      name: "Event Reminder",
      subject: "Your Event is Coming Up",
      content: "Don't forget about your upcoming event...",
    },
  ];
  const addRecipient = useCallback(() => {
    if (
      recipientInput.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientInput)
    ) {
      setRecipientList([...recipientList, recipientInput.trim()]);
      setRecipientInput("");
    }
  }, [recipientInput, recipientList]);
  const removeRecipient = useCallback(
    (email: string) => {
      setRecipientList(recipientList.filter((r) => r !== email));
    },
    [recipientList],
  );
  const applyTemplate = useCallback(
    (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setSubject(template.subject);
        setContent(template.content);
        setSelectedTemplate(templateId);
      }
    },
    [templates],
  );
  const handleCreateCampaign = useCallback(() => {
    if (!campaignName || !subject || !content || recipientList.length === 0) {
      alert(
        "Please fill in all required fields and add at least one recipient",
      );
      return;
    }
    const campaignData: CampaignData = {
      name: campaignName,
      subject,
      content,
      recipientList,
      sendTime,
    };
    onCampaignCreate?.(campaignData);
  }, [
    campaignName,
    subject,
    content,
    recipientList,
    sendTime,
    onCampaignCreate,
  ]);
  return (
    <div className="space-y-6 p-6 bg-surface rounded-lg">
      {" "}
      <div className="grid grid-cols-3 gap-4">
        {" "}
        {/* Left Column - Campaign Details */}{" "}
        <div className="col-span-1 space-y-4">
          {" "}
          <Card className="p-4">
            {" "}
            <h3 className="font-semibold mb-3 text-sm">
              Campaign Details
            </h3>{" "}
            <div className="space-y-3">
              {" "}
              <div>
                {" "}
                <label className="text-xs font-medium">
                  Campaign Name *
                </label>{" "}
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Q4 Launch"
                  className="mt-1"
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-xs font-medium">Send Time</label>{" "}
                <Input
                  type="datetime-local"
                  value={sendTime.toISOString().slice(0, 16)}
                  onChange={(e) => setSendTime(new Date(e.target.value))}
                  className="mt-1"
                />{" "}
              </div>{" "}
            </div>{" "}
          </Card>{" "}
        </div>{" "}
        {/* Middle Column - Email Content */}{" "}
        <div className="col-span-1 space-y-4">
          {" "}
          <Card className="p-4">
            {" "}
            <h3 className="font-semibold mb-3 text-sm">Email Content</h3>{" "}
            <div className="space-y-3">
              {" "}
              <div>
                {" "}
                <label className="text-xs font-medium">Subject *</label>{" "}
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject line"
                  className="mt-1"
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-xs font-medium">Content *</label>{" "}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Email content"
                  className="mt-1 w-full h-24 p-2 border rounded text-xs"
                />{" "}
              </div>{" "}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {" "}
                {showPreview ? "Hide" : "Show"} Preview{" "}
              </Button>{" "}
            </div>{" "}
          </Card>{" "}
        </div>{" "}
        {/* Right Column - Templates & Recipients */}{" "}
        <div className="col-span-1 space-y-4">
          {" "}
          <Card className="p-4">
            {" "}
            <h3 className="font-semibold mb-3 text-sm">Templates</h3>{" "}
            <Select value={selectedTemplate} onValueChange={applyTemplate}>
              {" "}
              <SelectTrigger>
                {" "}
                <SelectValue placeholder="Select template" />{" "}
              </SelectTrigger>{" "}
              <SelectContent>
                {" "}
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {" "}
                    {template.name}{" "}
                  </SelectItem>
                ))}{" "}
              </SelectContent>{" "}
            </Select>{" "}
          </Card>{" "}
          <Card className="p-4">
            {" "}
            <h3 className="font-semibold mb-3 text-sm">
              {" "}
              Recipients ({recipientList.length}){" "}
            </h3>{" "}
            <div className="space-y-2">
              {" "}
              <div className="flex gap-1">
                {" "}
                <Input
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addRecipient();
                    }
                  }}
                  placeholder="Add email"
                  className="text-xs"
                />{" "}
                <Button size="sm" variant="outline" onClick={addRecipient}>
                  {" "}
                  Add{" "}
                </Button>{" "}
              </div>{" "}
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {" "}
                {recipientList.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="text-xs cursor-pointer"
                    onClick={() => removeRecipient(email)}
                  >
                    {" "}
                    {email} ×{" "}
                  </Badge>
                ))}{" "}
              </div>{" "}
            </div>{" "}
          </Card>{" "}
        </div>{" "}
      </div>{" "}
      {/* Preview Section */}{" "}
      {showPreview && (
        <Card className="p-4 bg-background">
          {" "}
          <h3 className="font-semibold mb-3 text-sm">Preview</h3>{" "}
          <div className="border rounded p-3 bg-surface text-xs space-y-2">
            {" "}
            <div>
              {" "}
              <strong>Subject:</strong> {subject || "(empty)"}{" "}
            </div>{" "}
            <div>
              {" "}
              <strong>Content:</strong>{" "}
              <div className="mt-1 whitespace-pre-wrap text-foreground">
                {" "}
                {content || "(empty)"}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </Card>
      )}{" "}
      {/* Action Buttons */}{" "}
      <div className="flex gap-2">
        {" "}
        <Button
          onClick={handleCreateCampaign}
          disabled={isLoading}
          className="flex-1"
        >
          {" "}
          {isLoading ? "Creating..." : "Create Campaign"}{" "}
        </Button>{" "}
      </div>{" "}
    </div>
  );
};
