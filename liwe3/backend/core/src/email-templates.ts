/**
 * Email templates for authentication-related emails
 */

export interface EmailTemplate {
	subject : string;
	textBody : string;
	htmlBody : string;
}

/**
 * Generates email verification template
 *
 * @param userName - User's display name or username
 * @param verificationUrl - Complete verification URL with token
 * @param appName - Application name to display in email
 * @returns Email template with subject and body content
 */
export function getVerificationEmail(
	userName : string,
	verificationUrl : string,
	appName : string,
) : EmailTemplate {
	const subject = `Verify your email address for ${appName}`;

	const textBody = `
Hello ${userName},

Thank you for signing up with ${appName}!

To complete your registration and activate your account, please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in 7 days.

If you didn't create an account with ${appName}, you can safely ignore this email.

Best regards,
The ${appName} Team
	`.trim();

	const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<table role="presentation" style="width: 100%; border-collapse: collapse;">
		<tr>
			<td align="center" style="padding: 40px 0;">
				<table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
					<!-- Header -->
					<tr>
						<td style="padding: 40px 40px 20px; text-align: center; background-color: #4f46e5; border-radius: 8px 8px 0 0;">
							<h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
								${appName}
							</h1>
						</td>
					</tr>

					<!-- Content -->
					<tr>
						<td style="padding: 40px;">
							<h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">
								Verify Your Email Address
							</h2>

							<p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
								Hello <strong>${userName}</strong>,
							</p>

							<p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
								Thank you for signing up with ${appName}! To complete your registration and activate your account, please verify your email address by clicking the button below:
							</p>

							<!-- CTA Button -->
							<table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
								<tr>
									<td align="center">
										<a href="${verificationUrl}"
										   style="display: inline-block; padding: 16px 32px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);">
											Verify Email Address
										</a>
									</td>
								</tr>
							</table>

							<p style="margin: 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
								Or copy and paste this link into your browser:
							</p>

							<p style="margin: 0 0 20px; padding: 12px; background-color: #f3f4f6; border-radius: 4px; color: #4b5563; font-size: 14px; word-break: break-all;">
								${verificationUrl}
							</p>

							<p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
								<strong>This verification link will expire in 7 days.</strong>
							</p>

							<p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
								If you didn't create an account with ${appName}, you can safely ignore this email.
							</p>
						</td>
					</tr>

					<!-- Footer -->
					<tr>
						<td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
							<p style="margin: 0; color: #9ca3af; font-size: 14px;">
								Best regards,<br>
								The ${appName} Team
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
	`.trim();

	return { subject, textBody, htmlBody };
}

/**
 * Generates password reset email template
 *
 * @param userName - User's display name or username
 * @param resetUrl - Complete password reset URL with token
 * @param appName - Application name to display in email
 * @returns Email template with subject and body content
 */
export function getPasswordResetEmail(
	userName : string,
	resetUrl : string,
	appName : string,
) : EmailTemplate {
	const subject = `Reset your password for ${appName}`;

	const textBody = `
Hello ${userName},

We received a request to reset your password for your ${appName} account.

To reset your password, please click the link below:

${resetUrl}

This password reset link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

Best regards,
The ${appName} Team
	`.trim();

	const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<table role="presentation" style="width: 100%; border-collapse: collapse;">
		<tr>
			<td align="center" style="padding: 40px 0;">
				<table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
					<!-- Header -->
					<tr>
						<td style="padding: 40px 40px 20px; text-align: center; background-color: #dc2626; border-radius: 8px 8px 0 0;">
							<h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
								${appName}
							</h1>
						</td>
					</tr>

					<!-- Content -->
					<tr>
						<td style="padding: 40px;">
							<h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">
								Reset Your Password
							</h2>

							<p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
								Hello <strong>${userName}</strong>,
							</p>

							<p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
								We received a request to reset your password for your ${appName} account. To reset your password, please click the button below:
							</p>

							<!-- CTA Button -->
							<table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
								<tr>
									<td align="center">
										<a href="${resetUrl}"
										   style="display: inline-block; padding: 16px 32px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.3);">
											Reset Password
										</a>
									</td>
								</tr>
							</table>

							<p style="margin: 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
								Or copy and paste this link into your browser:
							</p>

							<p style="margin: 0 0 20px; padding: 12px; background-color: #f3f4f6; border-radius: 4px; color: #4b5563; font-size: 14px; word-break: break-all;">
								${resetUrl}
							</p>

							<p style="margin: 20px 0 0; color: #dc2626; font-size: 14px; line-height: 1.6; font-weight: 600;">
								⚠️ This password reset link will expire in 1 hour.
							</p>

							<p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
								If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
							</p>
						</td>
					</tr>

					<!-- Footer -->
					<tr>
						<td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
							<p style="margin: 0; color: #9ca3af; font-size: 14px;">
								Best regards,<br>
								The ${appName} Team
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
	`.trim();

	return { subject, textBody, htmlBody };
}
