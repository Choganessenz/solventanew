<?php
/* ============================================================
   Solventa Digital, Kontaktformular, E-Mail-Versand
   ------------------------------------------------------------
   Nimmt die Anfrage aus dem Kontakt-Wizard (kontakt.html) per
   JSON entgegen und schickt sie per PHP mail() an Ihr Postfach.
   Kein Drittanbieter nötig, läuft auf jedem Hosting mit PHP.

   EINSTELLUNGEN: nur die beiden Zeilen unten anpassen.
   ============================================================ */

$EMPFAENGER  = 'info@solventa-digital.de';        // Hier kommen die Anfragen an
$ABSENDER    = 'info@solventa-digital.de';        // Absender, am besten eine Adresse Ihrer Domain
$ABSENDER_NAME = 'Solventa Website';

header('Content-Type: application/json; charset=utf-8');

// Nur POST erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['success' => false, 'message' => 'Methode nicht erlaubt.']);
  exit;
}

// JSON-Body einlesen (Fallback: klassische Formularfelder)
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) { $data = $_POST; }

// Kleiner Helfer: Wert holen + säubern
function feld($data, $key) {
  $v = isset($data[$key]) ? (string)$data[$key] : '';
  return trim($v);
}
// Schutz gegen Header-Injection (keine Zeilenumbrüche in Kopfzeilen)
function einzeilig($v) {
  return trim(str_replace(["\r", "\n", "%0a", "%0d"], ' ', $v));
}

// Honeypot: von Bots ausgefüllt -> wir tun so, als sei alles ok
$botcheck = feld($data, 'botcheck');
if ($botcheck !== '' && $botcheck !== 'false' && $botcheck !== '0') {
  echo json_encode(['success' => true]);
  exit;
}

$name    = einzeilig(feld($data, 'name'));
$email   = einzeilig(feld($data, 'email'));
$phone   = einzeilig(feld($data, 'phone'));
$leistung   = feld($data, 'leistung');
$paket      = feld($data, 'paket');
$art        = feld($data, 'art');
$zeit       = feld($data, 'zeit');
$nachricht  = feld($data, 'message');

// Pflichtfelder prüfen
if (strlen($name) < 2 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(422);
  echo json_encode(['success' => false, 'message' => 'Bitte Name und eine gültige E-Mail angeben.']);
  exit;
}

// Betreff + Textkörper aufbauen
$betreff = 'Neue Projektanfrage: ' . ($leistung !== '' ? $leistung : 'Solventa Website');

$zeilen = [
  'Neue Projektanfrage über die Website',
  str_repeat('=', 40),
  '',
  'Leistung:    ' . ($leistung !== '' ? $leistung : '—'),
  'Paket:       ' . ($paket    !== '' ? $paket    : '—'),
  'Projektart:  ' . ($art      !== '' ? $art      : '—'),
  'Zeitrahmen:  ' . ($zeit     !== '' ? $zeit     : '—'),
  '',
  'Name:        ' . $name,
  'E-Mail:      ' . $email,
  'Telefon:     ' . ($phone !== '' ? $phone : '—'),
  '',
  'Nachricht:',
  ($nachricht !== '' ? $nachricht : '—'),
  '',
  str_repeat('-', 40),
  'Gesendet am ' . date('d.m.Y H:i') . ' Uhr',
];
$body = implode("\n", $zeilen);

// Kopfzeilen
$absenderName = einzeilig($ABSENDER_NAME);
$headers  = 'From: ' . $absenderName . ' <' . $ABSENDER . '>' . "\r\n";
$headers .= 'Reply-To: ' . $name . ' <' . $email . '>' . "\r\n";
$headers .= 'Content-Type: text/plain; charset=UTF-8' . "\r\n";
$headers .= 'MIME-Version: 1.0' . "\r\n";
$headers .= 'X-Mailer: PHP/' . phpversion();

// Betreff UTF-8-sicher kodieren
$betreffEnc = '=?UTF-8?B?' . base64_encode($betreff) . '?=';

$ok = @mail($EMPFAENGER, $betreffEnc, $body, $headers, '-f' . $ABSENDER);

/* ============================================================
   Bestätigungs-Mail an den Absender (Kunden)
   Saubere, professionelle HTML-Mail. Schlägt der Versand fehl,
   bricht das NICHT die Erfolgsmeldung – die Hauptanfrage zählt.
   ============================================================ */
if ($ok) {
  $vorname  = trim(explode(' ', $name)[0]);
  $betreffK = 'Ihre Anfrage bei Solventa Digital Solutions';

  // Zusammenfassung der Angaben (nur Vorhandenes zeigen)
  $zusammenfassung = '';
  $rows = ['Leistung' => $leistung, 'Paket' => $paket, 'Projektart' => $art, 'Zeitrahmen' => $zeit];
  foreach ($rows as $label => $val) {
    if ($val !== '') {
      $zusammenfassung .= '<tr>'
        . '<td style="padding:6px 14px 6px 0;color:#71717a;font-size:14px;white-space:nowrap;vertical-align:top">' . htmlspecialchars($label) . '</td>'
        . '<td style="padding:6px 0;color:#09090b;font-size:14px;font-weight:600">' . htmlspecialchars($val) . '</td>'
        . '</tr>';
    }
  }
  $nachrichtBlock = '';
  if ($nachricht !== '') {
    $nachrichtBlock = '<tr>'
      . '<td style="padding:6px 14px 6px 0;color:#71717a;font-size:14px;vertical-align:top">Nachricht</td>'
      . '<td style="padding:6px 0;color:#09090b;font-size:14px">' . nl2br(htmlspecialchars($nachricht)) . '</td>'
      . '</tr>';
  }

  $htmlMail = '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">'
    . '<meta name="viewport" content="width=device-width,initial-scale=1">'
    . '<meta name="color-scheme" content="light dark">'
    . '<meta name="supported-color-schemes" content="light dark">'
    . '<style>:root{color-scheme:light dark;supported-color-schemes:light dark;}'
    . '[data-ogsc] .sol-head-title{color:#ffffff !important;}'
    . '[data-ogsc] .sol-head-sub{color:#c7d4ff !important;}</style></head>'
    . '<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">'
    . '<tr><td align="center">'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">'
    . '<tr><td style="background:linear-gradient(135deg,#1230d6,#020d7c);padding:36px 32px;text-align:center;">'
    . '<div class="sol-head-title" style="font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#ffffff !important;mso-color-alt:#ffffff;">'
    . '<font color="#ffffff"><span style="color:#ffffff !important;">Solventa Digital Solutions</span></font></div>'
    . '<div class="sol-head-sub" style="font-size:13px;margin-top:6px;color:#c7d4ff !important;">'
    . '<font color="#c7d4ff"><span style="color:#c7d4ff !important;">Webdesign &middot; Grafikdesign &middot; Digitale Systeme</span></font></div>'
    . '</td></tr>'
    . '<tr><td style="padding:36px 32px 8px;">'
    . '<h1 style="margin:0 0 16px;font-size:22px;color:#09090b;font-weight:700;">Vielen Dank, ' . htmlspecialchars($vorname) . '!</h1>'
    . '<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#3f3f46;">'
    . 'Ihre Anfrage ist bei uns angekommen. Wir melden uns <strong>innerhalb von 24&nbsp;Stunden</strong> bei Ihnen, meist deutlich schneller.</p>';

  if ($zusammenfassung !== '' || $nachrichtBlock !== '') {
    $htmlMail .= '<p style="margin:24px 0 8px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#39ceff;">Ihre Angaben</p>'
      . '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e4e4e7;margin-top:6px;padding-top:8px;">'
      . $zusammenfassung . $nachrichtBlock . '</table>';
  }

  $htmlMail .= '<p style="margin:28px 0 0;font-size:15px;line-height:1.65;color:#3f3f46;">'
    . 'Sie brauchen es schneller? Rufen Sie uns direkt an: '
    . '<a href="tel:+4915510457759" style="color:#020d7c;font-weight:600;text-decoration:none;">0155 10457759</a>.</p>'
    . '<p style="margin:20px 0 0;font-size:15px;line-height:1.65;color:#3f3f46;">Beste Gr&uuml;&szlig;e<br><strong>Ihr Team von Solventa Digital Solutions</strong></p>'
    . '</td></tr>'
    . '<tr><td style="padding:24px 32px 32px;">'
    . '<div style="border-top:1px solid #e4e4e7;padding-top:18px;font-size:12px;line-height:1.6;color:#a1a1aa;">'
    . 'Solventa Digital Solutions &middot; Ettelner Weg 6, 33100 Paderborn<br>'
    . '<a href="https://solventa-digital.de" style="color:#71717a;text-decoration:none;">solventa-digital.de</a> &middot; '
    . '<a href="mailto:info@solventa-digital.de" style="color:#71717a;text-decoration:none;">info@solventa-digital.de</a><br>'
    . 'Diese E-Mail wurde automatisch versendet, weil Sie ein Formular auf unserer Website abgeschickt haben.'
    . '</div></td></tr>'
    . '</table></td></tr></table></body></html>';

  $headersK  = 'From: ' . $absenderName . ' <' . $ABSENDER . '>' . "\r\n";
  $headersK .= 'Reply-To: ' . $ABSENDER . "\r\n";
  $headersK .= 'Content-Type: text/html; charset=UTF-8' . "\r\n";
  $headersK .= 'MIME-Version: 1.0' . "\r\n";
  $headersK .= 'X-Mailer: PHP/' . phpversion();
  $betreffKEnc = '=?UTF-8?B?' . base64_encode($betreffK) . '?=';

  @mail($email, $betreffKEnc, $htmlMail, $headersK, '-f' . $ABSENDER);
}

if ($ok) {
  echo json_encode(['success' => true]);
} else {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => 'E-Mail konnte nicht gesendet werden.']);
}
