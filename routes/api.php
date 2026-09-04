<?php

/**
 * @var $this RouteFileRegistrar
 */

use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\SiteSettingController;
use App\Http\Controllers\Manage\AuthController;
use App\Http\Controllers\Manage\BootstrapController;
use App\Http\Controllers\Manage\CatalogController as ManageCatalogController;
use App\Http\Controllers\Manage\CategoryController as ManageCategoryController;
use App\Http\Controllers\Manage\MessageController;
use App\Http\Controllers\Manage\PageController;
use App\Http\Controllers\Manage\SiteSettingController as ManageSiteSettingController;
use Illuminate\Routing\RouteFileRegistrar;
use Illuminate\Routing\Router;

/*
|--------------------------------------------------------------------------
| 业务接口（前后端分离的后端半边：唯一 Blade 壳 + JSON API）
|--------------------------------------------------------------------------
|
| 归级全部走显式 tier（优先级最高，config/forge.php 的 match.prefix 已让位）——
| strict_mode 才能兜住「漏写归级」：宁可直接 500，也不要静默掉进 unassigned。
|
| 鉴权两层：
|   - 会话层 'web'（session + CSRF）：登录与全部 manage 接口需要会话态。
|     SPA 侧由 forge.js 的 X-XSRF-TOKEN 拦截器供给 token；GET/HEAD 请求天然免 CSRF。
|   - 准入层 'manage'（EnsureManageAccess，别名注册见 bootstrap/app.php）：
|     登录 + is_manager 两道门，纯 JSON 响应（401 / 403）。
|
| 路由命名空间：公开侧 api.*，管理端 api.manage.*（管理端独占 /manage URI 段，
| GET index/show 与公开侧语义不同——含草稿——不能同名，见 Manage\CatalogController）。
|
| 前端调用：useForgeApi('public')；useForgeApi({ level: 'manage', prefix: 'api.manage.' })
*/

$this->router->group([], function (Router $r) {
    // ── 公开数据接口（level: public，eager 预加载）──────────────────
    $r->tier('public')->name('api.')->group(function (Router $r) {
        $r->get('/catalogs', [CatalogController::class, 'index'])->name('catalogs.index');
        $r->get('/catalogs/{slug}', [CatalogController::class, 'show'])->name('catalogs.show');
        $r->get('/categories', [CategoryController::class, 'index'])->name('categories.index');
        $r->get('/site', [SiteSettingController::class, 'show'])->name('site.show');
        $r->post('/contact', [ContactController::class, 'store'])->name('contact.store');
    });

    // ── 登录（level: public —— 登录时还没有会话，必须放行）─────────
    // 需要会话层（登录要写 session），故挂 web 组；CSRF 由 SPA 的 X-XSRF-TOKEN 供给
    $r->post('/auth/login', [AuthController::class, 'store'])
        ->name('api.auth.login')
        ->middleware('web')
        ->tier('public');

    // ── 管理端接口（level: manage，lazy + 受保护）──────────────────
    $r->group([
        'tier'       => 'manage',
        'middleware' => ['web', 'manage'],
        'as'         => 'api.manage.',
    ], function (Router $r) {
        // 登出（在 manage 组内 = 未登录本来就调不到，幂等）
        $r->post('/manage/auth/logout', [AuthController::class, 'destroy'])->name('logout');

        // 首屏引导（身份 + 统计）：放在 manage 层级内，未登录连数字都读不到
        $r->get('/manage/bootstrap', BootstrapController::class)->name('bootstrap');

        // 画册 CRUD（含草稿，与公开侧 index/show 语义不同）
        $r->get('/manage/catalogs', [ManageCatalogController::class, 'index'])->name('catalogs.index');
        $r->post('/manage/catalogs', [ManageCatalogController::class, 'store'])->name('catalogs.store');
        $r->get('/manage/catalogs/{catalog}', [ManageCatalogController::class, 'show'])->name('catalogs.show');
        $r->put('/manage/catalogs/{catalog}', [ManageCatalogController::class, 'update'])->name('catalogs.update');
        $r->delete('/manage/catalogs/{catalog}', [ManageCatalogController::class, 'destroy'])->name('catalogs.destroy');

        // 画册页（嵌套在画册下）
        $r->get('/manage/catalogs/{catalog}/pages', [PageController::class, 'index'])->name('catalogs.pages.index');
        $r->post('/manage/catalogs/{catalog}/pages', [PageController::class, 'store'])->name('catalogs.pages.store');
        $r->post('/manage/catalogs/{catalog}/pages/reorder', [PageController::class, 'reorder'])->name('catalogs.pages.reorder');
        $r->put('/manage/pages/{page}', [PageController::class, 'update'])->name('pages.update');
        $r->delete('/manage/pages/{page}', [PageController::class, 'destroy'])->name('pages.destroy');

        // 分类维护
        $r->get('/manage/categories', [ManageCategoryController::class, 'index'])->name('categories.index');
        $r->post('/manage/categories', [ManageCategoryController::class, 'store'])->name('categories.store');
        $r->post('/manage/categories/reorder', [ManageCategoryController::class, 'reorder'])->name('categories.reorder');
        $r->put('/manage/categories/{category}', [ManageCategoryController::class, 'update'])->name('categories.update');
        $r->delete('/manage/categories/{category}', [ManageCategoryController::class, 'destroy'])->name('categories.destroy');

        // 站点基础资料（singleton）
        $r->put('/manage/site', [ManageSiteSettingController::class, 'update'])->name('site.update');

        // 留言
        $r->get('/manage/messages', [MessageController::class, 'index'])->name('messages.index');
        $r->put('/manage/messages/{message}', [MessageController::class, 'update'])->name('messages.update');
    });
});
