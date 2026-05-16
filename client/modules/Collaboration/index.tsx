/**
 * Native Collaboration Module
 *
 * Comprehensive collaboration features that compete with Teams:
 * - Video conferencing (WebRTC)
 * - Instant messaging
 * - File sharing
 * - Screen sharing
 * - Team presence
 * All features work independently without integrations
 * All text is i18n-ready with translation keys
 */

import React, { lazy, Suspense } from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, MessageSquare, Share2, Users, Settings } from "lucide-react";
import { useI18n } from "@/i18n";

const VideoCallPanel = lazy(() => import("./client/components/VideoCallPanel"));
const ChatPanel = lazy(() => import("./client/components/ChatPanel"));
const FileSharePanel = lazy(() => import("./client/components/FileSharePanel"));
const PresencePanel = lazy(() => import("./client/components/PresencePanel"));
const IntegrationSettingsPanel = lazy(
  () => import("./client/components/IntegrationSettingsPanel"),
);
const MiniChatWindow = lazy(() => import("./client/components/MiniChatWindow"));

export interface CollaborationPanelProps {
  panelId?: string;
  onClose?: () => void;
  onMinimize?: () => void;
}

export default function CollaborationPanel({
  panelId,
  onClose,
  onMinimize,
}: CollaborationPanelProps) {
  const { t } = useI18n();

  return (
    <PanelFrame
      title={t("collaboration.title") || "Collaboration"}
      subtitle={
        t("collaboration.subtitle") || "Video, chat, file sharing, and more"
      }
      status="Active"
      chrome={true}
      className="h-full w-full"
    >
      <div className="relative h-full w-full">
        <Tabs defaultValue="chat" className="h-full w-full flex flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {t("chat.title") || "Chat"}
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              {t("video.call.title") || "Video Call"}
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              {t("file.share.title") || "File Share"}
            </TabsTrigger>
            <TabsTrigger value="presence" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t("presence.title") || "Presence"}
            </TabsTrigger>
            <TabsTrigger
              value="integrations"
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              {t("integrations.title") || "Integrations"}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <Suspense
              fallback={
                <div className="p-4">{t("common.loading") || "Loading..."}</div>
              }
            >
              <TabsContent value="chat" className="h-full m-0">
                <ChatPanel />
              </TabsContent>
              <TabsContent value="video" className="h-full m-0">
                <VideoCallPanel />
              </TabsContent>
              <TabsContent value="files" className="h-full m-0">
                <FileSharePanel />
              </TabsContent>
              <TabsContent value="presence" className="h-full m-0">
                <PresencePanel />
              </TabsContent>
              <TabsContent value="integrations" className="h-full m-0">
                <IntegrationSettingsPanel />
              </TabsContent>
            </Suspense>
          </div>
        </Tabs>
        <Suspense fallback={null}>
          <MiniChatWindow />
        </Suspense>
      </div>
    </PanelFrame>
  );
}
