<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalogs', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('subtitle')->nullable();
            $table->string('cover_image')->nullable();
            // 单本画册的主色：前台翻页组件的进度条、书脊、页码都取这个值
            $table->string('theme_color', 20)->default('#1668ac');
            $table->text('summary')->nullable();
            // draft 只在管理端可见；published 且 published_at 非空才进前台与公开 API
            $table->string('status', 20)->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['status', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalogs');
    }
};
