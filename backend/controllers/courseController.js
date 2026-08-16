const CourseModel = require('../models/courseModel');
const { logActivity } = require('../utils/activity');

const CourseController = {

  // -------- Courses --------
  async getCourses(req, res) {
    try {
      const { search, branch, semester, status, page = 1, limit = 50 } = req.query;
      const result = await CourseModel.findAllCourses({
        search, branch, semester, status, page: parseInt(page), limit: parseInt(limit)
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Get courses error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching courses' });
    }
  },

  async getCourse(req, res) {
    try {
      const course = await CourseModel.findCourseById(req.params.id);
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      res.json({ success: true, data: course });
    } catch (error) {
      console.error('Get course error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async createCourse(req, res) {
    try {
      const { course_name, course_code, branch, semester, credits, description, status } = req.body;
      if (!course_name || !course_code) {
        return res.status(400).json({ success: false, message: 'Course name and code are required' });
      }
      const course = await CourseModel.createCourse({
        course_name, course_code, branch, semester, credits, description, status
      });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'course_created',
        description: `${req.user.username} created course ${course_name} (${course_code})`
      });

      res.status(201).json({ success: true, message: 'Course created successfully', data: course });
    } catch (error) {
      console.error('Create course error:', error);
      res.status(500).json({ success: false, message: 'Server error while creating course' });
    }
  },

  async updateCourse(req, res) {
    try {
      const course = await CourseModel.updateCourse(req.params.id, req.body);
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'course_updated',
        description: `${req.user.username} updated course ${course.course_name}`,
        relatedType: 'course', relatedId: course.id
      });

      res.json({ success: true, message: 'Course updated successfully', data: course });
    } catch (error) {
      console.error('Update course error:', error);
      res.status(500).json({ success: false, message: 'Server error while updating course' });
    }
  },

  async deleteCourse(req, res) {
    try {
      const affected = await CourseModel.deleteCourse(req.params.id);
      if (!affected) return res.status(404).json({ success: false, message: 'Course not found' });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'course_deleted',
        description: `${req.user.username} deleted course #${req.params.id}`
      });

      res.json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
      console.error('Delete course error:', error);
      res.status(500).json({ success: false, message: 'Server error while deleting course' });
    }
  },

  // -------- Subjects --------
  async getSubjects(req, res) {
    try {
      const { search, branch, semester, status, page = 1, limit = 50 } = req.query;
      const result = await CourseModel.findAllSubjects({
        search, branch, semester, status, page: parseInt(page), limit: parseInt(limit)
      });
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Get subjects error:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching subjects' });
    }
  },

  async getSubject(req, res) {
    try {
      const subject = await CourseModel.findSubjectById(req.params.id);
      if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
      res.json({ success: true, data: subject });
    } catch (error) {
      console.error('Get subject error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async createSubject(req, res) {
    try {
      const { subject_name, subject_code, branch, semester, credits, teacher, course_id, status } = req.body;
      if (!subject_name || !subject_code || !branch || !semester) {
        return res.status(400).json({ success: false, message: 'Subject name, code, branch and semester are required' });
      }
      const subject = await CourseModel.createSubject({
        subject_name, subject_code, branch, semester, credits, teacher, course_id, status
      });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'subject_created',
        description: `${req.user.username} created subject ${subject_name} (${subject_code})`,
        relatedType: 'subject', relatedId: subject.id
      });

      res.status(201).json({ success: true, message: 'Subject created successfully', data: subject });
    } catch (error) {
      console.error('Create subject error:', error);
      res.status(500).json({ success: false, message: 'Server error while creating subject' });
    }
  },

  async updateSubject(req, res) {
    try {
      const subject = await CourseModel.updateSubject(req.params.id, req.body);
      if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'subject_updated',
        description: `${req.user.username} updated subject ${subject.subject_name}`,
        relatedType: 'subject', relatedId: subject.id
      });

      res.json({ success: true, message: 'Subject updated successfully', data: subject });
    } catch (error) {
      console.error('Update subject error:', error);
      res.status(500).json({ success: false, message: 'Server error while updating subject' });
    }
  },

  async deleteSubject(req, res) {
    try {
      const affected = await CourseModel.deleteSubject(req.params.id);
      if (!affected) return res.status(404).json({ success: false, message: 'Subject not found' });

      logActivity({
        userId: req.user.id, username: req.user.username,
        action: 'subject_deleted',
        description: `${req.user.username} deleted subject #${req.params.id}`
      });

      res.json({ success: true, message: 'Subject deleted successfully' });
    } catch (error) {
      console.error('Delete subject error:', error);
      res.status(500).json({ success: false, message: 'Server error while deleting subject' });
    }
  },

  // GET /api/subjects/options?branch=&semester= — active subjects for dropdowns
  async getSubjectOptions(req, res) {
    try {
      const { branch, semester } = req.query;
      const subjects = await CourseModel.subjectsFor(branch, semester);
      res.json({ success: true, data: subjects });
    } catch (error) {
      console.error('Get subject options error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = CourseController;
