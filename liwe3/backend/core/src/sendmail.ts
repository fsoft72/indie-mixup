import { AwsClient } from 'aws4fetch';
import { type LiWEResponse, responseError, responseSuccess } from './response';

export type AwsCredentials = {
	access_key : string;
	secret_key : string;
	region : string;
};

export type SendMailInput = {
	fromEmailAddress : string;
	toAddresses : string[];
	subject : string;
	textBody? : string;
	htmlBody? : string;
	replyToAddresses? : string[];
};

type ReturnType = {
	id_message? : string;
	rawResponse? : Response;
};

function _formatMailDump( input : SendMailInput ) : string {
	const separator = '='.repeat( 60 );
	const lines = [
		separator,
		`[MAIL DEBUG] ${new Date().toISOString()}`,
		separator,
		`From:    ${input.fromEmailAddress}`,
		`To:      ${input.toAddresses.join( ', ' )}`,
		...( input.replyToAddresses?.length ? [ `ReplyTo: ${input.replyToAddresses.join( ', ' )}` ] : [] ),
		`Subject: ${input.subject}`,
		'-'.repeat( 60 ),
	];

	if ( input.textBody ) {
		lines.push( '[TEXT BODY]', input.textBody );
	}

	if ( input.htmlBody ) {
		lines.push( '[HTML BODY]', input.htmlBody );
	}

	lines.push( separator, '' );

	return lines.join( '\n' );
}

export async function sendMail(
	creds : AwsCredentials,
	input : SendMailInput,
) : Promise<LiWEResponse<ReturnType>> {
	// Debug mode: if access_key is "debug", dump email to console instead of sending
	if ( creds.access_key === 'debug' ) {
		console.log( _formatMailDump( input ) );
		return responseSuccess( { id_message: `debug-${Date.now()}` } );
	}

	const aws = new AwsClient( {
		accessKeyId: creds.access_key,
		secretAccessKey: creds.secret_key,
		region: creds.region,
		service: 'ses',
	} );

	const body = {
		FromEmailAddress: input.fromEmailAddress,
		Destination: {
			ToAddresses: input.toAddresses,
		},
		ReplyToAddresses: input.replyToAddresses,
		Content: {
			Simple: {
				Subject: { Data: input.subject, Charset: 'UTF-8' },
				Body: {
					...( input.htmlBody
						? { Html: { Data: input.htmlBody, Charset: 'UTF-8' } }
						: {} ),
					...( input.textBody
						? { Text: { Data: input.textBody, Charset: 'UTF-8' } }
						: {} ),
				},
			},
		},
	};

	const endpoint = `https://email.${creds.region}.amazonaws.com/v2/email/outbound-emails`;

	const res = await aws.fetch( endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify( body ),
	} );

	if ( !res.ok ) {
		const errText = await res.text().catch( () => '' );
		return responseError(
			`SES sendMail failed: ${res.status} ${res.statusText}${errText ? ` - ${errText}` : ''}`,
			501,
			'SEND_MAIL_ERROR',
		);
	}

	let messageId : string | undefined;
	try {
		const json = ( await res.clone().json() ) as { MessageId? : string };
		messageId = json.MessageId;
	} catch {
		// response may be empty
	}

	return responseSuccess( { id_message: messageId, rawResponse: res } );
}
