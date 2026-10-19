import { getUser } from "@/lib/auth";
import { seedCourses } from "@/lib/seed-courses";
import { secureMutation } from "@/lib/security";
import { reply, fail } from "@/lib/http";
export const POST = secureMutation(async () => {
  if ((await getUser())?.role !== "ADMIN") return fail("Solo el administrador puede añadir cursos de ejemplo.", 403);
  return reply({ added: await seedCourses() });
});
