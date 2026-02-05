import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const faqItems = [
  {
    question: "How do I create a new event request?",
    answer:
      "Navigate to Event Requests in the sidebar and click 'New Event Request'. Fill out the event details form. Your draft will be auto-saved. Once complete, submit the request for approval. The system will automatically route it through the approval chain based on your position in the hierarchy.",
  },
  {
    question: "What happens if my event request is rejected?",
    answer:
      "If your event request is rejected, it will appear in the 'Rejected' tab under Event Requests. You'll see the reason for rejection provided by the approver. To proceed, you must create a new request. You can use the 'Create new from rejected' option to start a new draft based on the rejected request.",
  },
  {
    question: "Can I modify an approved event?",
    answer:
      "Yes, but only after the event has been approved by the Global Director. Once approved, you can request modifications from the event detail page. The modification request goes through the same approval chain. While pending, the original event remains active with a 'Modification pending' badge.",
  },
  {
    question: "How does the approval process work?",
    answer:
      "When you submit an event request, the system builds an approval chain by walking up the organizational pyramid. Each approver level (City Curator, Regional Curator, Lead Curator, Global Director) can approve or reject. Approvals move to the next level, while rejections stop the process and require you to create a new request.",
  },
  {
    question: "What venues can I see and use?",
    answer:
      "Event Planners can only see venues they created. Curators see venues created by users under them in the hierarchy. Global Directors see all venues. You can edit or remove venues you created. If you create a venue with the same name and address, it will update the existing one instead of creating a duplicate.",
  },
  {
    question: "How do I submit an event report?",
    answer:
      "After an event's date has passed, it automatically moves to 'Completed – Awaiting report'. Navigate to the event detail page and fill out the report form with attendance numbers and media links/uploads. Submit the report, and it will go through the approval chain up to Global Director. Once approved, the event moves to 'Completed – Archived'.",
  },
  {
    question: "What if my report is rejected?",
    answer:
      "If your report is rejected, you'll receive a reason from the approver. You can revise the report and resubmit it. The event will remain in 'Completed – Awaiting report' status until the report is approved.",
  },
  {
    question: "Can I cancel an approved event?",
    answer:
      "Yes, if you have cancellation permissions (configured by Global Director). Navigate to the approved event and request cancellation. You must provide a reason. The cancellation request goes through the approval chain. If Global Director approves, the event status changes to Cancelled. If rejected, the event remains active.",
  },
  {
    question: "What is the pyramid visibility rule?",
    answer:
      "The pyramid visibility rule means you can only see your own data plus data from users under you in the organizational hierarchy. You cannot see data from colleagues at the same rank. Global Directors can see everything. This ensures proper data isolation and security.",
  },
  {
    question: "How do event templates work?",
    answer:
      "Templates allow you to save event configurations for reuse. Templates are private to each user. When creating a new event, you can load a saved template to pre-fill the form. You can also save the current event as a template for future use. This helps speed up event creation for recurring events.",
  },
];

export function FAQTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Frequently Asked Questions</CardTitle>
        <CardDescription>Find answers to common questions about using the system</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
