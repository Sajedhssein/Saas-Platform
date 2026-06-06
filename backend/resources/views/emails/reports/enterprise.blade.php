<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $report->title }}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr>
        <td align="center">
            <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
                <tr>
                    <td style="background:#0f172a;color:#ffffff;padding:28px 32px;">
                        <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#94a3b8;">Enterprise Report</div>
                        <h1 style="margin:8px 0 0;font-size:24px;line-height:1.2;">{{ $report->title }}</h1>
                        <div style="margin-top:8px;color:#cbd5e1;">{{ $report->report_type }} • {{ $report->format }}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:28px 32px;">
                        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Your report is attached and ready for review. You can also download it from the secure link below.</p>
                        <p style="margin:0 0 22px;">
                            <a href="{!! $actionUrl !!}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">{{ $actionLabel }}</a>
                        </p>
                        <div style="border-top:1px solid #e2e8f0;padding-top:18px;color:#475569;font-size:13px;line-height:1.7;">
                            <div><strong>Company:</strong> {{ $report->company?->name }}</div>
                            <div><strong>Status:</strong> {{ $report->status }}</div>
                            <div><strong>Generated:</strong> {{ optional($report->generated_at)->toDateTimeString() }}</div>
                        </div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
