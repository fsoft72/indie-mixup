import mime from 'mime';

export const ext2mime = ( fileName : string ) => {
	return mime.getType( fileName ) || 'application/octet-stream';
};

export const mime2ext = ( m : string ) => {
	return mime.getExtension( m ) || '';
};
