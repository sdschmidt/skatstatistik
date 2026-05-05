ALTER TABLE "ergebnisse" DROP CONSTRAINT "ergebnisse_datum_spieltage_datum_fk";
--> statement-breakpoint
ALTER TABLE "ergebnisse" ADD CONSTRAINT "ergebnisse_datum_spieltage_datum_fk" FOREIGN KEY ("datum") REFERENCES "public"."spieltage"("datum") ON DELETE cascade ON UPDATE cascade;