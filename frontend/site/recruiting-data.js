/* Recruiting content, used by the homepage popup (recruiting.js) and the recruiting page (recruiting.html).
   Everything in this file is shown publicly, so keep internal notes out of it.
   Edit it each cycle. Set enabled to false when recruiting ends (popup and tray icon go away; the page stays up). */
window.USB_RECRUITING = {
  enabled: true,
  title: "Now Recruiting",
  callout: "Purdue USB is recruiting new board members!",
  blurb: "Join us at our first callout on Thursday, November 19 from 7:30 to 8:30 PM in Lawson Commons. Applications open the same day.",
  pageUrl: "/recruiting.html",
  applyUrl: "",    /* paste the application link here when it is ready */
  applyLabel: "Apply Now",
  next: { heading: "Callout #1", when: "Thursday, November 19 · 7:30–8:30 PM", where: "Lawson Commons", note: "Applications open the same night.", iso: "2026-11-19T19:30:00-05:00", endIso: "2026-11-19T20:30:00-05:00" },
  /* The hero countdown counts down to "opens", then to "closes". Times are Eastern. */
  applications: { opens: "2026-11-19T19:30:00-05:00", closes: "2027-01-22T23:59:00-05:00" },
  intro: "The Undergraduate Student Board is run by CS students, for CS students. We run CS193, host student forums and town halls, put on career panels and social events, and keep a set of resources for undergrads. Joining the board means helping make the CS experience at Purdue better.",
  steps: [
    { i: "i-people", t: "Come to a callout", d: "We hold two identical callouts. Attend at least one to have your application considered. You'll hear what USB does, meet current board members and get your questions answered." },
    { i: "i-doc", t: "Apply", d: "Applications open November 19 and are due January 22. Be sure to attend at least one callout, or arrange a make-up with us if you can't make either." },
    { i: "i-chat", t: "Interview", d: "Selected applicants are invited to an individual interview and a group interview, plus a casual social with current board members." },
    { i: "i-mail", t: "Hear back", d: "We announce decisions once interviews wrap up." }
  ],
  timeline: [
    { date: "Thu, Nov 19", label: "Callout #1, 7:30–8:30 PM in Lawson Commons. Applications open." },
    { date: "January", label: "Callout #2 (dates to be announced)" },
    { date: "Fri, Jan 22", label: "Applications due" },
    { date: "To be announced", label: "Interviews" },
    { date: "To be announced", label: "Decisions" }
  ],
  faqs: [
    { q: "Do I have to attend a callout?", a: "Yes. Attend at least one of the two identical callouts to have your application considered." },
    { q: "What if I can't make a callout?", a: "We value face time with prospective members, so please try your best to show up. If you truly can't make either one, email usb@cs.purdue.edu. Your application will still be fully considered if you email in for a make-up." },
    { q: "What is the time commitment for USB?", a: "The commitment is flexible, but plan on at least 2 hours a week." },
    { q: "Can I choose what I work on?", a: "Most members are part of about three initiatives. You tell us on the application which initiative you'd most like to join and why, and members have a high likelihood of being placed in initiatives they prefer." },
    { q: "How do I stay up to date?", a: "Follow @purdueusb on Instagram. We post the application timeline and callout details there." }
  ],
  contact: "usb@cs.purdue.edu"
};
