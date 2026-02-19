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
      "When you submit an event request, the system builds an approval chain by walking up the organizational pyramid. Each approver level (City Curator, Regional Curator, Lead Curator, Global Director) can approve or reject. The Global Director cannot bypass this flow—they must approve in their turn like any other approver. At each step, the approver receives an OTP by email and must enter it to confirm approve or reject. Approvals move to the next level; rejections stop the process and require a reason.",
  },
  {
    question: "Why do I need to enter an OTP when approving or rejecting?",
    answer:
      "For security, every approve or reject action requires OTP verification. When it's your turn to approve or reject an event, modification, cancellation, venue request, or report, the system sends a one-time code to your email. You must enter this code to complete the action. This ensures that only the intended approver can take the action.",
  },
  {
    question: "How does creating a venue work?",
    answer:
      "Creating a new venue uses the same approval chain as creating an event. Your venue request goes up the organization (City → Regional → Lead → Global Director). At each step, the approver must verify with OTP to approve or reject. Only after Global Director approval is the venue added to the database. You see venues you created or those from users below you (by pyramid visibility).",
  },
  {
    question: "Who can add DJs?",
    answer:
      "Only the Global Director can add DJs to the system. Other roles can view DJs according to pyramid visibility (e.g. on the Calendar page). To add or edit DJs, you need Global Director access.",
  },
  {
    question: "What does the Calendar page show?",
    answer:
      "The Calendar page shows all events and DJs according to your pyramid level. You see events and DJs you have access to based on the organization hierarchy. You can filter by city, region, date, and view current approved events, past events, and cancelled/rejected events.",
  },
  {
    question: "What is the marketing report and who approves it?",
    answer:
      "After an event is approved by the Global Director, the Marketing Manager must add a marketing report for that event. The marketing report is then submitted to the Global Director for approval. The Global Director must verify with OTP to approve or reject the marketing report. This is separate from the event report that the Event Planner submits after the event date.",
  },
  {
    question: "When is the calendar event email sent and to whom?",
    answer:
      "After the Global Director approves an event, the system sends a calendar event email to the event planner, the assigned DJs, other subordinates, and the marketing manager. This notifies everyone involved that the event is approved and scheduled.",
  },
  {
    question: "What venues can I see and use?",
    answer:
      "Event Planners can only see venues they created (after approval). Curators see venues created by users under them in the hierarchy. Global Directors see all venues. Creating a new venue goes through the same approval chain as creating an event; only after full approval is the venue available. You can edit or remove venues you created. Global Director can ban venues.",
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
