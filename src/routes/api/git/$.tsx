import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { createFileRoute } from "@tanstack/react-router";
import {
	contentTypeFor,
	formatAdvertisement,
	gitProvider,
	parseSmartHttpPath,
} from "#/modules/git";
import { getPublicOrganizationFn } from "#/modules/organizations";

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

				try {
					await getPublicOrganizationFn({
						data: { organizationName: parsed.organizationName },
					});
				} catch {
					return new Response("Repository Not Found", { status: 404 });
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

				try {
					await getPublicOrganizationFn({
						data: { organizationName: parsed.organizationName },
					});
				} catch {
					return new Response("Repository Not Found", { status: 404 });
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
