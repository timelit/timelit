import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AIAssistant from "./AIAssistant";
import { Bot } from "lucide-react";

export default function AIAssistantModal({ isOpen, onClose, onSuggestEvent }) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-card">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Bot className="w-5 h-5 text-primary" />
                        AI Assistant
                    </DialogTitle>
                </DialogHeader>
                <div className="mt-4 max-h-[70vh] overflow-y-auto">
                    <AIAssistant onSuggestEvent={onSuggestEvent} />
                </div>
            </DialogContent>
        </Dialog>
    );
}