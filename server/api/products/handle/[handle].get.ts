export default defineApiHandler(async event => {
  return ok(await new ProductService(db).getByHandle(readProductHandle(event)));
});
