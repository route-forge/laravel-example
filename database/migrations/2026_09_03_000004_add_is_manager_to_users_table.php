<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * 企业侧登录管理端的账号标记。
     *
     * 本示例不引入完整权限体系（spatie/laravel-permission 之类）：
     * `manage` 中间件只认这一个布尔位，够把「懒加载 + 受保护层级的元信息端点」
     * 这条链路演示清楚，替换成 gate 时改动点也只集中在 EnsureManageAccess 一处。
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_manager')->default(false)->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_manager');
        });
    }
};
