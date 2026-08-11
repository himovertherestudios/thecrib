import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPerformancePlaybackForUser } from "@/lib/mux/get-performance-playback";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ performanceId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { performanceId } = await params;
  const result = await getPerformancePlaybackForUser(performanceId);

  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : 409;
    return NextResponse.json({ error: result.reason }, { status });
  }

  return NextResponse.json({
    playbackId: result.playbackId,
    token: result.token,
    assetType: result.assetType,
  });
}
