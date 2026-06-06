<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>You're invited</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%);padding:36px 40px;color:#fff;">
              <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.85;">Invitation</div>
              <h1 style="margin:12px 0 0;font-size:32px;line-height:1.2;">You have been invited to join {{ optional($invite->company)->name ?? 'our platform' }}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hello,</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">{{ optional($invite->creator)->name ?? 'A team member' }} invited you to join <strong>{{ optional($invite->company)->name ?? 'the company' }}</strong> as <strong>{{ strtoupper($invite->role) }}</strong>.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                <tr>
                  <td style="padding:18px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;">
                    <div style="font-size:13px;color:#475569;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Invitation details</div>
                    <div style="font-size:15px;line-height:1.8;">
                      <div><strong>Email:</strong> {{ $invite->email }}</div>
                      <div><strong>Role:</strong> {{ strtoupper($invite->role) }}</div>
                      <div><strong>Expires:</strong> {{ optional($invite->expires_at)->format('M j, Y g:i A') ?? 'No expiration set' }}</div>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 28px;font-size:16px;line-height:1.7;">Click the button below to accept the invitation and complete your onboarding.</p>
              <p style="margin:0 0 28px;">
                <a href="{{ $acceptUrl }}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px;">Accept Invitation</a>
              </p>
              <p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:#64748b;">If the button does not work, paste this link into your browser:</p>
              <p style="margin:0 0 28px;font-size:13px;line-height:1.7;word-break:break-all;">
                <a href="{{ $acceptUrl }}" style="color:#1d4ed8;">{{ $acceptUrl }}</a>
              </p>
              <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">If you were not expecting this invitation, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
