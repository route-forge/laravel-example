<?php
/**
 * @var $this RouteFileRegistrar
 */

use App\Http\Controllers\IndexController;
use Illuminate\Routing\RouteFileRegistrar;
use Illuminate\Routing\Router;

$this->router->group([
    'tier' => 'public',
], function (Router $r) {
    $r->get('/', IndexController::class)->name('index');
    $r->fallback(IndexController::class)->name('fallback');
});
