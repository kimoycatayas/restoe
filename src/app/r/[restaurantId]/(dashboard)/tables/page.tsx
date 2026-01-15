import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { TableDialog } from "@/components/tables/table-dialog";
import { DeleteTableButton } from "@/components/tables/delete-table-button";

interface TablesPageProps {
  params: Promise<{ restaurantId: string }>;
}

export default async function TablesPage({ params }: TablesPageProps) {
  const { restaurantId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch tables scoped by restaurant_id, ordered by name
  const { data: tables, error } = await supabase
    .from("tables")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching tables:", error);
  }

  const tablesList = tables || [];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "available":
        return "default";
      case "occupied":
        return "secondary";
      case "reserved":
        return "outline";
      case "out_of_service":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tables</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your restaurant tables
          </p>
        </div>
        <TableDialog restaurantId={restaurantId} />
      </div>

      {tablesList.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">No tables yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first table to get started
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tablesList.map((table) => (
                <TableRow key={table.id}>
                  <TableCell className="font-medium">{table.name}</TableCell>
                  <TableCell>{table.capacity}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(table.status)}>
                      {formatStatus(table.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <TableDialog
                        restaurantId={restaurantId}
                        table={table}
                        trigger={
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DeleteTableButton
                        restaurantId={restaurantId}
                        tableId={table.id}
                        tableName={table.name}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
