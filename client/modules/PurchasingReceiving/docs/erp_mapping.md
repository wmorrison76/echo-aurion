# ERP Field Mapping

| Canonical Field  | Restaurant365   | Simphony         | NetSuite (REST) |
|------------------|-----------------|-----------------|-----------------|
| invoice.id       | AP Invoice ID   | Document Number | externalId      |
| invoice.vendor   | Vendor.Id       | Supplier.Name   | vendor          |
| invoice.total    | Amount          | Amount          | total           |
| line.item_code   | Item.Code       | ItemCode        | item            |
| line.description | Description     | Description     | description     |
| line.qty         | Quantity        | Quantity        | quantity        |
| line.unit_price  | UnitCost        | UnitPrice       | rate            |
| line.gl_code     | GLAccount       | GLCode          | account         |
