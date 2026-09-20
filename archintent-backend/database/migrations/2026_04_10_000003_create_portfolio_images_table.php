<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portfolio_images', function (Blueprint $table) {
            $table->bigIncrements('image_id');
            $table->unsignedBigInteger('portfolio_id');
            $table->string('image_path');
            $table->timestamp('uploaded_at');

            // Foreign key
            $table->foreign('portfolio_id')
                ->references('portfolio_id')
                ->on('portfolios')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolio_images');
    }
};
