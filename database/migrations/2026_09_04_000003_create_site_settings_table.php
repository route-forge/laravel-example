<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 站点基础资料是单行配置（singleton）：永远只有 id=1 一行，迁移时直接种下默认值，
        // 免去「查不到再建」的竞态与空态分支
        Schema::create('site_settings', function (Blueprint $table) {
            $table->id();
            $table->string('site_name');
            $table->string('brand_slogan')->nullable();
            $table->string('logo_url')->nullable();
            $table->text('intro')->nullable();
            $table->string('contact_phone', 50)->nullable();
            $table->string('contact_email', 200)->nullable();
            $table->string('contact_address', 500)->nullable();
            $table->string('icp', 100)->nullable();
            $table->timestamps();
        });

        \Illuminate\Database\Eloquent\Model::unguarded(function () {
            \App\Models\SiteSetting::create(['site_name' => '我的企业']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings');
    }
};
