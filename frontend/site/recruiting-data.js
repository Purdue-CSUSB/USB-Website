/* Recruiting content, used by the homepage popup (recruiting.js) and the recruiting page (recruiting.html).
   Edit this file each cycle. Set enabled to false when recruiting ends (popup and tray icon go away; the page stays up). */
window.USB_RECRUITING = {
  enabled: true,
  title: "Now Recruiting",
  callout: "Purdue USB is recruiting new board members!",
  blurb: "Applications for the next board are opening soon.",
  pageUrl: "/recruiting.html",
  applyUrl: "",    /* paste the application link here */
  applyLabel: "Apply Now",
  intro: "The Undergraduate Student Board is run by CS students, for CS students. Joining the board means helping run mentorship, events, career resources and more for the Purdue CS community.",
  who: "Open to all Purdue CS, DS and AI students. No prior board experience is needed. Tell us which initiatives you care about and why you would be a great fit.",
  timeline: [
    { date: "TBA", label: "Applications open" },
    { date: "TBA", label: "Info session" },
    { date: "TBA", label: "Applications due" },
    { date: "TBA", label: "Interviews" },
    { date: "TBA", label: "Decisions announced" }
  ],
  faqs: [
    { q: "Who can apply?", a: "Any Purdue CS, DS or AI student. We recruit across all class years." },
    { q: "How much time does it take?", a: "TBA" },
    { q: "Which initiatives can I join?", a: "See the Initiatives folder on the homepage for everything the board runs." }
  ],
  contact: "usb@cs.purdue.edu"
};
