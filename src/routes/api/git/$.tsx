import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { createFileRoute } from "@tanstack/react-router";
import { getGitRequestUser } from "#/modules/auth";
import {
	contentTypeFor,
	formatAdvertisement,
	gitProvider,
	parseSmartHttpPath,
} from "#/modules/git";
import { requireRepositoryPermissionForUser } from "#/modules/organizations";
import { ForbiddenError, NotFoundError } from "#/platform/errors";

const UNAUTHORIZED_RESPONSE = {
	status: 401,
	headers: { "WWW-Authenticate": 'Basic realm="Nirvana Git"' },
};

async function authorize(
	request: Request,
	organizationName: string,
	repositoryName: string,
	service: "git-upload-pack" | "git-receive-pack",
): Promise<Response | undefined> {
	const user = await getGitRequestUser(request);
	if (!user) {
		return new Response("Authentication Required", UNAUTHORIZED_RESPONSE);
	}
	try {
		await requireRepositoryPermissionForUser(
			organizationName,
			repositoryName,
			user.id,
			service === "git-upload-pack" ? "read" : "write",
		);
	} catch (error) {
		if (error instanceof ForbiddenError) {
			return new Response("Forbidden", { status: 403 });
		}
		if (error instanceof NotFoundError) {
			return new Response("Repository Not Found", { status: 404 });
		}
		throw error;
	}
	return undefined;
}

export const Route = createFileRoute("/api/git/$")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				const { _splat } = params;
				if (!_splat) {
					return new Response("Not Found", { status: 404 });
				}

				const url = new URL(request.url);
				const parsed = parseSmartHttpPath(_splat, url.searchParams);
				const locator = {
					organizationName: parsed.organizationName,
					repositoryName: parsed.repoName,
				};

				if (
					parsed.endpoint !== "info/refs" ||
					(parsed.service !== "git-upload-pack" &&
						parsed.service !== "git-receive-pack")
				) {
					return new Response("Not Found", { status: 404 });
				}

				const authorizationError = await authorize(
					request,
					parsed.organizationName,
					parsed.repoName,
					parsed.service,
				);
				if (authorizationError) {
					return authorizationError;
				}
				if (!(await gitProvider.exists(locator))) {
					return new Response("Repository Not Found", { status: 404 });
				}

				const rawStream = await gitProvider.advertiseRefs(
					locator,
					parsed.service,
				);
				const formatted = formatAdvertisement(parsed.service, rawStream);

				return new Response(formatted, {
					headers: {
						"Content-Type": contentTypeFor(parsed.service, "advertise"),
					},
				});
			},
			POST: async ({ params, request }) => {
				const { _splat } = params;
				if (!_splat) {
					return new Response("Not Found", { status: 404 });
				}

				const parsed = parseSmartHttpPath(
					_splat,
					new URL(request.url).searchParams,
				);
				const locator = {
					organizationName: parsed.organizationName,
					repositoryName: parsed.repoName,
				};

				if (
					parsed.endpoint !== "git-upload-pack" &&
					parsed.endpoint !== "git-receive-pack"
				) {
					return new Response("Not Found", { status: 404 });
				}

				const authorizationError = await authorize(
					request,
					parsed.organizationName,
					parsed.repoName,
					parsed.service,
				);
				if (authorizationError) {
					return authorizationError;
				}
				if (!(await gitProvider.exists(locator))) {
					return new Response("Repository Not Found", { status: 404 });
				}

				let body = request.body;
				if (!body) {
					return new Response("Bad Request", { status: 400 });
				}

				const contentEncoding = request.headers.get("content-encoding");
				if (contentEncoding?.includes("gzip")) {
					const nodeIn = Readable.fromWeb(body as never);
					const gunzip = createGunzip();
					body = Readable.toWeb(nodeIn.pipe(gunzip)) as never;
				}

				const resultStream = await gitProvider.invokeService(
					locator,
					parsed.service,
					body,
				);

				return new Response(resultStream, {
					headers: {
						"Content-Type": contentTypeFor(parsed.service, "result"),
					},
				});
			},
		},
	},
	component: () => null,
});
