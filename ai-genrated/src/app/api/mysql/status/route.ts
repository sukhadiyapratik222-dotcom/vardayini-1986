import { NextResponse } from "next/server";
import { dbPool, testConnection } from "@/lib/mysql";

export const dynamic = "force-dynamic";

export async function GET() {
  const connTest = await testConnection();

  if (!connTest.mysql.success) {
    return NextResponse.json(
      {
        ok: false,
        database: process.env.MYSQL_DATABASE || "vardayini_sweets",
        host: process.env.MYSQL_HOST || "localhost",
        port: Number(process.env.MYSQL_PORT) || 3306,
        error: connTest.mysql.error || "Failed to connect to MySQL database",
        message: "Failed to connect to MySQL database. Ensure XAMPP MySQL is running.",
      },
      { status: 500 }
    );
  }

  try {
    const [tables] = (await dbPool.query("SHOW TABLES")) as [Array<Record<string, string>>, unknown];
    const tableCounts: Record<string, number> = {};

    for (const t of tables) {
      const tableName = Object.values(t)[0];
      const [rows] = (await dbPool.query(`SELECT COUNT(*) as count FROM \`${tableName}\``)) as [
        Array<{ count: number }>,
        unknown,
      ];
      tableCounts[tableName] = rows[0]?.count ?? 0;
    }

    return NextResponse.json({
      ok: true,
      engine: "MySQL (phpMyAdmin 5.2.1 / XAMPP)",
      database: process.env.MYSQL_DATABASE || "vardayini_sweets",
      host: process.env.MYSQL_HOST || "localhost",
      port: Number(process.env.MYSQL_PORT) || 3306,
      message: "Successfully connected to MySQL database 'vardayini_sweets'",
      tables: tableCounts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Query error",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const { syncEntireDatabaseToMysql } = await import("@/db/seed");
    await syncEntireDatabaseToMysql();
    return GET();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Sync error",
      },
      { status: 500 }
    );
  }
}

