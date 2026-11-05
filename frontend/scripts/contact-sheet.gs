/* Receives the Contact Us form from purdueusb.com and adds one row per message to this Google Sheet.
   Setup: see frontend/site/README.md ("Contact form"). Paste this into Extensions > Apps Script in the Sheet,
   then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone). */
const SHEET_NAME = 'Messages';
const NOTIFY = 'usb@cs.purdue.edu'; // also email each message here; set to '' to only write to the Sheet

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.hp_check) return out({ result: 'success' }); // hidden spam-trap field was filled in: pretend it worked
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) sh.appendRow(['Time', 'Name', 'Email', 'Subject', 'Message', 'Acknowledged']);
    sh.appendRow([new Date(), clean(p.Name), clean(p._replyto), clean(p._subject), clean(p.Message), p.acknowledge ? 'yes' : 'no']);
    if (NOTIFY) {
      try {
        MailApp.sendEmail({
          to: NOTIFY,
          replyTo: String(p._replyto || ''),
          subject: 'USB website message: ' + String(p._subject || '').slice(0, 150),
          body: 'From: ' + p.Name + ' <' + p._replyto + '>\n\n' + p.Message
        });
      } catch (err) { /* the row is saved even if the email fails */ }
    }
    return out({ result: 'success' });
  } catch (err) {
    return out({ result: 'error' });
  } finally {
    lock.releaseLock();
  }
}

// Stops a message that starts with = + - @ from being run as a formula in Sheets.
function clean(v) {
  v = String(v || '').slice(0, 5000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}
function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
