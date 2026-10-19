import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../lib/db";
import {
  getProfileData,
  getOrderHistory,
  userOrdersWhere,
  orderDepartment,
  accountDate,
} from "../lib/account";
import { supportLink, rechargeLink } from "../lib/account-links";
test("order sections keep user scoping and support historical category fallback", () => {
  assert.deepEqual(userOrdersWhere("me", "todos"), { userId: "me" });
  for (const section of ["streaming", "tienda", "segunda", "cursos"] as const) {
    const where = userOrdersWhere("me", section);
    assert.equal(where.userId, "me");
    const rules = (where.items as { some: { OR: unknown[] } }).some.OR;
    assert.equal(rules.length, 2);
    assert.ok(JSON.stringify(rules[1]).includes('"category":""'));
  }
  assert.equal(orderDepartment("Cursos"), "cursos");
  assert.equal(orderDepartment("Audio"), "tienda");
  assert.equal(orderDepartment("Calzado usado"), "segunda");
  assert.equal(orderDepartment("Combos"), "streaming");
  assert.equal(orderDepartment("Música"), "streaming");
});
test("WhatsApp links use the requested number and exact messages", () => {
  const support = new URL(supportLink),
    recharge = new URL(rechargeLink);
  assert.equal(support.pathname, "/573223037790");
  assert.equal(support.searchParams.get("text"), "Necesito soporte...");
  assert.equal(recharge.searchParams.get("text"), "quiero recargar saldo.");
  assert.ok(accountDate("2026-10-11T01:00:00Z").includes("10"));
});
test("history pagination includes older orders and never removes the user filter", async () => {
  const count = db.order.count,
    find = db.order.findMany;
  try {
    db.order.count = (async (args: { where: { userId: string } }) => {
      assert.equal(args.where.userId, "me");
      return 45;
    }) as unknown as typeof count;
    db.order.findMany = (async (args: {
      where: { userId: string };
      skip: number;
      take: number;
    }) => {
      assert.equal(args.where.userId, "me");
      assert.equal(args.skip, 40);
      assert.equal(args.take, 20);
      return [];
    }) as unknown as typeof find;
    const result = await getOrderHistory("me", "todos", 999);
    assert.equal(result.page, 3);
    assert.equal(result.pages, 3);
    assert.equal(result.total, 45);
  } finally {
    db.order.count = count;
    db.order.findMany = find;
  }
});
test("profile statistics and purchased items are private; seller lists are scoped and capped", async () => {
  const user = db.user.findUniqueOrThrow,
    aggregate = db.order.aggregate,
    count = db.order.count,
    items = db.orderItem.findMany;
  const saleQueries: unknown[] = [];
  try {
    db.user.findUniqueOrThrow = (async (args: { where: { id: string } }) => {
      assert.equal(args.where.id, "me");
      return {
        id: "me",
        name: "Test",
        email: "test@example.com",
        role: "VENDEDOR",
        balance: 25000,
        createdAt: new Date(),
      };
    }) as unknown as typeof user;
    db.order.aggregate = (async (args: { where: { userId: string } }) => {
      assert.equal(args.where.userId, "me");
      return { _sum: { total: 40000 } };
    }) as unknown as typeof aggregate;
    db.order.count = (async (args: { where: { userId: string } }) => {
      assert.equal(args.where.userId, "me");
      return 3;
    }) as unknown as typeof count;
    db.orderItem.findMany = (async (args: {
      take: number;
      where: { order?: { userId: string } };
    }) => {
      assert.equal(args.take, 10);
      if (args.where.order) assert.equal(args.where.order.userId, "me");
      else saleQueries.push(args.where);
      return [];
    }) as unknown as typeof items;
    const buyer = await getProfileData("me", "CLIENTE");
    assert.equal(buyer.totalSpent, 40000);
    assert.equal(buyer.orderCount, 3);
    assert.equal(saleQueries.length, 0);
    await getProfileData("me", "VENDEDOR");
    assert.deepEqual(saleQueries[0], {
      OR: [{ sellerId: "me" }, { sellerId: null, product: { ownerId: "me" } }],
    });
    await getProfileData("me", "ADMIN");
    assert.deepEqual(saleQueries[1], {
      OR: [
        { sellerId: "me" },
        { sellerId: null, product: { ownerId: "me" } },
        { sellerId: null, product: { ownerId: null } },
      ],
    });
  } finally {
    db.user.findUniqueOrThrow = user;
    db.order.aggregate = aggregate;
    db.order.count = count;
    db.orderItem.findMany = items;
  }
});
