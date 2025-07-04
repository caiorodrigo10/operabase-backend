import { useState, useEffect } from "react";
import { ConversationsSidebar } from "./ConversationsSidebar";
import { MainConversationArea } from "./MainConversationArea";
import { PatientInfoPanel } from "./PatientInfoPanel";
import { mockConversations, createTimelineItems, mockPatientInfo, conversationFilters } from "@/lib/mock-data";
import { Conversation, TimelineItem, PatientInfo } from "@/types/conversations";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConversasLayout() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | undefined>();
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [currentPatientInfo, setCurrentPatientInfo] = useState<PatientInfo | undefined>();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [showPatientInfo, setShowPatientInfo] = useState(false);

  // Handle responsive layout
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1200);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Auto-select first conversation on load
  useEffect(() => {
    if (mockConversations.length > 0 && !selectedConversationId) {
      handleConversationSelect(mockConversations[0].id);
    }
  }, []);

  const handleConversationSelect = (conversationId: number) => {
    setSelectedConversationId(conversationId);
    
    // Load timeline items for selected conversation
    const timeline = createTimelineItems(conversationId);
    setTimelineItems(timeline);
    
    // Load patient info (using mock data for now)
    setCurrentPatientInfo(mockPatientInfo);
    
    // On mobile, hide sidebar when conversation is selected
    if (isMobile) {
      setShowPatientInfo(false);
    }
  };

  const handleSendMessage = (message: string) => {
    // This would integrate with your backend API
    console.log("Sending message:", message);
  };

  if (isMobile) {
    return (
      <div className="h-full bg-gray-50">
        {!selectedConversationId ? (
          // Mobile: Show conversations list
          <ConversationsSidebar
            conversations={mockConversations}
            selectedConversationId={selectedConversationId}
            onConversationSelect={handleConversationSelect}
          />
        ) : (
          // Mobile: Show conversation view
          <div className="h-full flex flex-col">
            <div className="flex items-center p-4 bg-white border-b">
              <button
                onClick={() => setSelectedConversationId(undefined)}
                className="mr-3 text-blue-600 font-medium"
              >
                ← Voltar
              </button>
              <span className="font-medium flex-1">
                {mockConversations.find(c => c.id === selectedConversationId)?.patient_name}
              </span>
              <Dialog open={showPatientInfo} onOpenChange={setShowPatientInfo}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-blue-600">
                    <Info className="w-4 h-4 mr-1" />
                    Info
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full h-full max-w-none m-0 p-0 rounded-none">
                  <div className="flex items-center justify-between p-4 border-b bg-white">
                    <h2 className="text-lg font-semibold">Informações do Paciente</h2>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowPatientInfo(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <PatientInfoPanel patientInfo={currentPatientInfo} />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <MainConversationArea
              timelineItems={timelineItems}
              patientInfo={currentPatientInfo}
              onSendMessage={handleSendMessage}
            />
          </div>
        )}
      </div>
    );
  }

  // Desktop layout (1200px+): 3 panels side by side
  if (!isMobile && !isTablet) {
    return (
      <div className="h-full flex bg-gray-50">
        {/* Conversations Sidebar - 25% */}
        <div className="w-1/4 min-w-[300px] border-r border-gray-200">
          <ConversationsSidebar
            conversations={mockConversations}
            selectedConversationId={selectedConversationId}
            onConversationSelect={handleConversationSelect}
          />
        </div>

        {/* Main Conversation Area - 50% */}
        <div className="w-1/2 min-w-0 border-r border-gray-200 h-full">
          <MainConversationArea
            timelineItems={timelineItems}
            patientInfo={currentPatientInfo}
            onSendMessage={handleSendMessage}
          />
        </div>

        {/* Patient Info Panel - 25% */}
        <div className="w-1/4 min-w-[300px]">
          <PatientInfoPanel patientInfo={currentPatientInfo} />
        </div>
      </div>
    );
  }

  // Tablet layout (768px-1200px): 2 panels + drawer
  if (isTablet) {
    return (
      <div className="h-full flex bg-gray-50">
        {/* Conversations Sidebar - 30% */}
        <div className="w-[30%] min-w-[280px] border-r border-gray-200">
          <ConversationsSidebar
            conversations={mockConversations}
            selectedConversationId={selectedConversationId}
            onConversationSelect={handleConversationSelect}
          />
        </div>

        {/* Main Conversation Area - 70% with Info Button */}
        <div className="flex-1 min-w-0 relative h-full">
          <MainConversationArea
            timelineItems={timelineItems}
            patientInfo={currentPatientInfo}
            onSendMessage={handleSendMessage}
            showInfoButton={true}
            onInfoClick={() => setShowPatientInfo(true)}
          />

          {/* Patient Info Drawer */}
          <Sheet open={showPatientInfo} onOpenChange={setShowPatientInfo}>
            <SheetContent side="right" className="w-80 p-0">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Informações do Paciente</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowPatientInfo(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <PatientInfoPanel patientInfo={currentPatientInfo} />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    );
  }
}