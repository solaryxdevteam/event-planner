"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupportTab } from "./SupportTab";
import { FAQTab } from "./FAQTab";
import { DocumentTab } from "./DocumentTab";

export function HelpCenterClient() {
  return (
    <Tabs defaultValue="support" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="support">Support</TabsTrigger>
        <TabsTrigger value="faq">FAQ</TabsTrigger>
        <TabsTrigger value="document">Documentation</TabsTrigger>
      </TabsList>
      <TabsContent value="support" className="mt-6">
        <SupportTab />
      </TabsContent>
      <TabsContent value="faq" className="mt-6">
        <FAQTab />
      </TabsContent>
      <TabsContent value="document" className="mt-6">
        <DocumentTab />
      </TabsContent>
    </Tabs>
  );
}
