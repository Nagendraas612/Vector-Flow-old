import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ok, fail } from "@/lib/json";

export async function POST(request, { params }) {
  const session = getSession();
  if (!session) return fail("NOT_SIGNED_IN", 401);
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) return fail("EVENT_NOT_FOUND", 404);
  if (event.status !== "PUBLISHED") return fail("REGISTRATION_CLOSED", 400);
  const now = new Date();
  if (event.registrationOpensAt && now < event.registrationOpensAt) return fail("REGISTRATION_CLOSED", 400);
  if (event.registrationClosesAt && now > event.registrationClosesAt) return fail("REGISTRATION_CLOSED", 400);
  const body = await request.json();
  if (!body.name || !body.usn || !body.email) return fail("INVALID_FILE", 400);
  const isPaid = event.feeType === "PAID";
  if (isPaid && !body.paymentScreenshotUrl) return fail("PAYMENT_REQUIRED", 400);
  if (body.paymentScreenshotUrl) {
    const u = String(body.paymentScreenshotUrl);
    if (!u.startsWith("http://") && !u.startsWith("https://")) return fail("INVALID_FILE", 400);
    if (u.length > 2000) return fail("INVALID_FILE", 400);
  }
  try {
    const registration = await prisma.registration.create({
      data: {
        eventId: event.id,
        userId: session.userId,
        name: body.name,
        usn: body.usn,
        email: body.email,
        branch: body.branch || null,
        semester: body.semester ? Number(body.semester) : null,
        phone: body.phone || null,
        paymentStatus: isPaid ? "PENDING_REVIEW" : "NOT_REQUIRED",
        paymentScreenshotUrl: body.paymentScreenshotUrl || null,
      },
    });
    return ok({ registration }, 201);
  } catch (e) {
    if (e && e.code === "P2002") return fail("ALREADY_REGISTERED", 400);
    return fail("INVALID_FILE", 400);
  }
}
