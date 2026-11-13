interface Env {
	ENVIRONMENT: "local" | "stage" | "production";
	DEV_MODE: "true" | "false";
	DB: D1Database;
	KV: KVNamespace;
	UPLOAD_BUCKET: R2Bucket;
	ASSETS: Fetcher;
}
