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

if ($ok) {
  echo json_encode(['success' => true]);
} else {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => 'E-Mail konnte nicht gesendet werden.']);
}
