<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('architect_project_images', function (Blueprint $table) {
            $table->id('image_id');
            $table->unsignedBigInteger('architect_project_id');
            $table->string('image_path', 255);
            $table->string('caption', 255)->nullable();
            $table->boolean('is_cover')->default(false);
            $table->integer('display_order')->default(0);
            $table->timestamp('uploaded_at')->useCurrent();

            $table->foreign('architect_project_id')->references('architect_project_id')->on('architect_projects')->onDelete('cascade');
            $table->index(['architect_project_id', 'display_order'], 'apimg_project_order_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('architect_project_images');
    }
};
