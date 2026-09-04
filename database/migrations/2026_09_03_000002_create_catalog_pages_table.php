<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_pages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('catalog_id')->constrained()->cascadeOnDelete();
            // 页序从 1 开始，前台按 sort_order 翻页；reorder 接口整批回写
            $table->unsignedInteger('sort_order')->default(1);
            $table->string('title')->nullable();
            $table->text('body')->nullable();
            $table->string('image')->nullable();
            // cover 封面页 / text 纯文字 / split 图文左右 / image 整图 / quote 引言 / back 封底
            $table->string('layout', 20)->default('text');
            // light 浅底深字、dark 深底浅字：翻页时两页配色不同，过渡才看得出层次
            $table->string('tone', 10)->default('light');
            $table->timestamps();

            $table->index(['catalog_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_pages');
    }
};
