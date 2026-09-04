<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))->withRouting(
    web: __DIR__ . '/../routes/web.php',
    api: __DIR__ . '/../routes/api.php',
    commands: __DIR__ . '/../routes/console.php',
    health: '/up',
)->withMiddleware(function (Middleware $middleware): void {
    // 管理端准入：登录 + is_manager 两道门，挂在 routes/api.php 的 manage 组
    // 与 config/forge.php 的 manage.endpoint_middleware（层级明细端点保护）上
    $middleware->alias([
        'manage' => App\Http\Middleware\EnsureManageAccess::class,
    ]);
})->withExceptions(function (Exceptions $exceptions): void {
    $exceptions->shouldRenderJsonWhen(
        fn(Request $request) => $request->is('api/*') || $request->expectsJson(),
    );
})->create();
