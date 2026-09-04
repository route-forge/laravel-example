<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('catalogs', function (Blueprint $table) {
            // 删除分类时画册保留，只是回到「未分类」（nullable，不强制归属）
            $table->foreignId('category_id')
                ->nullable()
                ->after('slug')
                ->constrained('categories')
                ->nullOnDelete();

            $table->index(['category_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('catalogs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('category_id');
            $table->dropIndex(['category_id', 'status']);
        });
    }
};
