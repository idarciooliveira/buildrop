import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createServerOnlyFn } from "@tanstack/react-start";

import type { AppPlatform } from "./platform";
import { contentTypeForPlatform } from "./platform";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;

function requireR2Config() {
	if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
		throw new Error("R2 environment variables are not configured");
	}

	return { accountId, accessKeyId, bucket, secretAccessKey };
}

function getR2Client() {
	const config = requireR2Config();

	return new S3Client({
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
		endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
		forcePathStyle: true,
		region: "auto",
		requestChecksumCalculation: "WHEN_REQUIRED",
	});
}

export const createDownloadUrl = createServerOnlyFn(
	async function createDownloadUrl({
		fileName,
		key,
	}: {
		fileName: string;
		key: string;
	}) {
		const config = requireR2Config();

		return getSignedUrl(
			getR2Client(),
			new GetObjectCommand({
				Bucket: config.bucket,
				Key: key,
				ResponseContentDisposition: `attachment; filename="${fileName.replaceAll('"', "'")}"`,
			}),
			{ expiresIn: 60 * 10 },
		);
	},
);

export const createUploadUrl = createServerOnlyFn(
	async function createUploadUrl({
		key,
		platform,
		size,
	}: {
		key: string;
		platform: AppPlatform;
		size: number;
	}) {
		const config = requireR2Config();

		return getSignedUrl(
			getR2Client(),
			new PutObjectCommand({
				Bucket: config.bucket,
				ContentLength: size,
				ContentType: contentTypeForPlatform(platform),
				Key: key,
			}),
			{ expiresIn: 60 * 60 },
		);
	},
);

export const getObjectInfo = createServerOnlyFn(async function getObjectInfo(
	key: string,
) {
	const config = requireR2Config();
	const object = await getR2Client().send(
		new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
	);

	return {
		contentLength: object.ContentLength ?? null,
		contentType: object.ContentType ?? null,
	};
});

export const getObjectBytes = createServerOnlyFn(async function getObjectBytes(
	key: string,
) {
	const config = requireR2Config();
	const object = await getR2Client().send(
		new GetObjectCommand({ Bucket: config.bucket, Key: key }),
	);

	if (!object.Body) {
		throw new Error("Uploaded object is empty");
	}

	return Buffer.from(await object.Body.transformToByteArray());
});

export const putObjectStream = createServerOnlyFn(
	async function putObjectStream({
		body,
		key,
		platform,
		size,
	}: {
		body: ReadableStream<Uint8Array>;
		key: string;
		platform: AppPlatform;
		size: number;
	}) {
		const config = requireR2Config();

		await getR2Client().send(
			new PutObjectCommand({
				Body: Readable.fromWeb(body as NodeReadableStream<Uint8Array>),
				Bucket: config.bucket,
				ContentLength: size,
				ContentType: contentTypeForPlatform(platform),
				Key: key,
			}),
		);
	},
);

export const deleteObject = createServerOnlyFn(async function deleteObject(
	key: string,
) {
	const config = requireR2Config();

	await getR2Client().send(
		new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
	);
});
