namespace webapi.Middleware;

public sealed class CorrelationIdMiddleware(RequestDelegate next)
{
    public const string HeaderName = "X-Correlation-Id";

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers.TryGetValue(HeaderName, out var existing)
            ? existing.ToString()
            : Guid.NewGuid().ToString("n");

        context.Items[HeaderName] = correlationId;
        context.Response.Headers[HeaderName] = correlationId;

        using (context.RequestServices.GetRequiredService<ILogger<CorrelationIdMiddleware>>().BeginScope(new Dictionary<string, object?>
               {
                   ["CorrelationId"] = correlationId
               }))
        {
            await next(context);
        }
    }
}
