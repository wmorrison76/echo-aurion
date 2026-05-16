import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function SupportModule() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // TODO: Send to support system
    console.log("Support request:", { name, email, subject, message });

    setSubmitted(true);
    setTimeout(() => {
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setSubmitted(false);
    }, 3000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Support & Help</CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-semibold text-green-600 mb-2">
                ✅ Request Submitted!
              </h3>
              <p className="text-gray-600">
                We'll get back to you within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Subject
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Message
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or question..."
                  rows={6}
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Submit Support Request
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Help</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">📚 Documentation</h3>
            <p className="text-sm text-gray-600">
              Visit our docs at docs.echoaurum.com
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">💬 Community</h3>
            <p className="text-sm text-gray-600">
              Join our Discord community for peer support
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">🎥 Video Tutorials</h3>
            <p className="text-sm text-gray-600">
              Watch training videos on our YouTube channel
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
